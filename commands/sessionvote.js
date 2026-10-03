const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const TOP_IMAGE =
    "https://discord-webhook.com/uploads/0f29dbbc461a621438710a56010d1a6b.png";

const BOTTOM_IMAGE =
    "https://discord-webhook.com/uploads/bb5f14a71e4668885d2c0f6da52caa20.png";

const STAFF_ROLE_ID =
    "1555284465318764724";

const SESSION_ROLE_ID =
    "1555281818935103568";

const JOIN_CODE =
    "LArPIF";

let activeVote = null;

function getVotePanel(votes, requiredVotes) {
    return [
        {
            type: 17,
            components: [

                {
                    type: 12,
                    items: [
                        {
                            media: {
                                url: TOP_IMAGE
                            }
                        }
                    ]
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,
                    content:
`# Session Vote

**<@&${STAFF_ROLE_ID}>** **<@&${SESSION_ROLE_ID}>**

> A session vote is currently active for **Los Angeles State Roleplay**.

**Votes:** \`${votes}/${requiredVotes}\``
                },

                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: "Vote",
                            custom_id: "session_vote"
                        }
                    ]
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 12,
                    items: [
                        {
                            media: {
                                url: BOTTOM_IMAGE
                            }
                        }
                    ]
                }
            ]
        }
    ];
}

function getSessionStartPanel(username) {

    const now = new Date();

    const date = now.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const time = now.toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });

    return [
        {
            type: 17,
            components: [

                {
                    type: 12,
                    items: [
                        {
                            media: {
                                url: TOP_IMAGE
                            }
                        }
                    ]
                },

                {
                    type: 14,
                    spacing: 2,
                    divider: true
                },

                {
                    type: 10,
                    content:
`# Session Start

**<@&${STAFF_ROLE_ID}>** **<@&${SESSION_ROLE_ID}>**

> A session has been initiated. At this time, we're asking those who voted during the waiting period to join. If you've voted for this session and don't join, you will face moderation action.

**Server Name:** \`Los Angeles State Roleplay\`
**Join Code:** \`${JOIN_CODE}\`

${username} • ${date} ${time}`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 12,
                    items: [
                        {
                            media: {
                                url: BOTTOM_IMAGE
                            }
                        }
                    ]
                }
            ]
        }
    ];
}

module.exports = {

    data: new SlashCommandBuilder()
        .setName("sessionvote")
        .setDescription(
            "Start a vote for a Los Angeles State Roleplay session."
        )
        .addIntegerOption(option =>
            option
                .setName("votes")
                .setDescription(
                    "Number of votes required to start the session."
                )
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {

        if (activeVote) {
            return interaction.reply({
                content:
                    "There is already an active session vote.",
                flags: MessageFlags.Ephemeral
            });
        }

        const requiredVotes =
            interaction.options.getInteger("votes");

        try {

            const message =
                await interaction.channel.send({
                    flags: MessageFlags.IsComponentsV2,
                    components:
                        getVotePanel(
                            0,
                            requiredVotes
                        )
                });

            activeVote = {
                message,
                requiredVotes,
                voters: new Set()
            };

            await interaction.reply({
                content:
                    `Session vote started with **${requiredVotes} votes** required.`,
                flags: MessageFlags.Ephemeral
            });

            const collector =
                message.createMessageComponentCollector({
                    filter: componentInteraction =>
                        componentInteraction.customId ===
                        "session_vote",

                    time:
                        60 * 60 * 1000
                });

            collector.on(
                "collect",
                async componentInteraction => {

                    if (!activeVote) {
                        return;
                    }

                    if (
                        activeVote.voters.has(
                            componentInteraction.user.id
                        )
                    ) {
                        await componentInteraction.reply({
                            content:
                                "You have already voted.",
                            flags:
                                MessageFlags.Ephemeral
                        });

                        return;
                    }

                    activeVote.voters.add(
                        componentInteraction.user.id
                    );

                    const voteCount =
                        activeVote.voters.size;

                    /*
                     * REQUIRED:
                     * Acknowledge the button immediately.
                     * This prevents the interaction from timing out.
                     */

                    if (
                        voteCount >=
                        activeVote.requiredVotes
                    ) {

                        const username =
                            componentInteraction.user.username;

                        await componentInteraction.update({
                            flags:
                                MessageFlags.IsComponentsV2,

                            components:
                                getSessionStartPanel(
                                    username
                                )
                        });

                        collector.stop(
                            "vote threshold reached"
                        );

                        activeVote = null;

                        console.log(
                            `[SESSION VOTE] Session started with ${voteCount} votes.`
                        );

                        return;
                    }

                    await componentInteraction.update({
                        flags:
                            MessageFlags.IsComponentsV2,

                        components:
                            getVotePanel(
                                voteCount,
                                activeVote.requiredVotes
                            )
                    });

                    console.log(
                        `[SESSION VOTE] ${componentInteraction.user.username} voted (${voteCount}/${activeVote.requiredVotes})`
                    );
                }
            );

            collector.on(
                "end",
                () => {

                    if (activeVote?.message.id === message.id) {
                        activeVote = null;
                    }

                    console.log(
                        "[SESSION VOTE] Vote ended."
                    );
                }
            );

        } catch (error) {

            console.error(
                "========== SESSION VOTE ERROR =========="
            );

            console.error(error);

            console.error(
                "========================================="
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        "I couldn't start the session vote. Check the terminal.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }
        }
    }
};