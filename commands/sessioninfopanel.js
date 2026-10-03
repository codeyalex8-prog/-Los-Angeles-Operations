const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const PANEL_IMAGE_TOP =
    "https://discord-webhook.com/uploads/3173c3c4cb0c3c0489e782e4ba74cc1c.png";

const PANEL_IMAGE_BOTTOM =
    "https://discord-webhook.com/uploads/bb5f14a71e4668885d2c0f6da52caa20.png";

const STAFF_ROLE_ID =
    "1555284465318764724";

const API_URL =
    "https://api.erlc.gg/v2/server";

const UPDATE_INTERVAL =
    30000;

// ======================================================
// PANEL STORAGE
// ======================================================

let panelChannelId = null;
let panelMessageId = null;
let updateInterval = null;

// ======================================================
// ER:LC API
// ======================================================

async function getERLCData() {
    const serverKey =
        process.env.ERLC_SERVER_KEY;

    if (!serverKey) {
        throw new Error(
            "ERLC_SERVER_KEY is missing from .env"
        );
    }

    const response = await fetch(
        `${API_URL}?Players=true&Staff=true&Queue=true`,
        {
            method: "GET",

            headers: {
                "Server-Key": serverKey,
                "Accept": "application/json"
            }
        }
    );

    const text =
        await response.text();

    let data;

    try {
        data =
            JSON.parse(text);
    } catch {
        throw new Error(
            `ER:LC returned invalid JSON: ${text}`
        );
    }

    if (!response.ok) {
        throw new Error(
            `ER:LC API ${response.status}: ${text}`
        );
    }

    return data;
}

// ======================================================
// PLAYER HELPERS
// ======================================================

function getPlayerName(player) {
    if (typeof player === "string") {
        return player;
    }

    return (
        player?.Player ||
        player?.Username ||
        player?.username ||
        player?.Name ||
        player?.name ||
        ""
    );
}

function getPlayers(data) {
    if (Array.isArray(data.Players)) {
        return data.Players;
    }

    return [];
}

function getQueue(data) {
    if (Array.isArray(data.Queue)) {
        return data.Queue;
    }

    return [];
}

// ======================================================
// ONLINE STAFF
// ======================================================

async function getOnlineStaff(
    guild,
    players
) {
    const staffRole =
        guild.roles.cache.get(
            STAFF_ROLE_ID
        );

    if (!staffRole) {
        console.log(
            `[STAFF] Role ${STAFF_ROLE_ID} was not found.`
        );

        return 0;
    }

    const onlinePlayers =
        new Set();

    for (const player of players) {
        const name =
            getPlayerName(player);

        if (!name) {
            continue;
        }

        onlinePlayers.add(
            name
                .trim()
                .toLowerCase()
        );
    }

    let onlineStaff = 0;

    for (
        const member of staffRole.members.values()
    ) {
        const discordName =
            member.nickname ||
            member.user.globalName ||
            member.user.username;

        if (!discordName) {
            continue;
        }

        const normalisedName =
            discordName
                .trim()
                .toLowerCase();

        if (
            onlinePlayers.has(
                normalisedName
            )
        ) {
            onlineStaff++;
        }
    }

    return onlineStaff;
}

// ======================================================
// BUILD PANEL
// ======================================================

async function buildPanel(guild) {
    const data =
        await getERLCData();

    const players =
        getPlayers(data);

    const queue =
        getQueue(data);

    const onlineStaff =
        await getOnlineStaff(
            guild,
            players
        );

    const playerCount =
        data.CurrentPlayers ??
        players.length;

    const maxPlayers =
        data.MaxPlayers ??
        50;

    const serverName =
        data.Name ??
        "Offline";

    const joinCode =
        data.JoinKey ??
        "-";

    console.log(
        `[ERLC] ${playerCount}/${maxPlayers} players | ${onlineStaff} staff | ${queue.length} queue`
    );

    return [
        {
            type: 17,

            components: [

                // TOP IMAGE
                {
                    type: 12,

                    items: [
                        {
                            media: {
                                url:
                                    PANEL_IMAGE_TOP
                            }
                        }
                    ]
                },

                // DIVIDER
                {
                    type: 14,
                    spacing: 2,
                    divider: true
                },

                // INTRO
                {
                    type: 10,

                    content:
`# <:944992bell:1555288511622549647> Sessions

> Los Angeles State Roleplay sessions run 24/7, aside from a handful of scheduled breaks. Hop in any time using the Quick-Join button below.`
                },

                // DIVIDER
                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                // SERVER INFO
                {
                    type: 10,

                    content:
`### ER\\:LC Server Information

- Server Name: \`${serverName}\`
- Server Join Code: \`${joinCode}\`
- Server Owner: **SaraiDavid13**`
                },

                // DIVIDER
                {
                    type: 14,
                    spacing: 2,
                    divider: true
                },

                // LIVE STATS
                {
                    type: 10,

                    content:
`### Server Statistics

- Player Count: \`${playerCount}/${maxPlayers}\`
- Online Staff: \`${onlineStaff}\`
- In Queue: \`${queue.length}\``
                },

                // DIVIDER
                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                // BOTTOM IMAGE
                {
                    type: 12,

                    items: [
                        {
                            media: {
                                url:
                                    PANEL_IMAGE_BOTTOM
                            }
                        }
                    ]
                }
            ]
        }
    ];
}

// ======================================================
// UPDATE PANEL
// ======================================================

async function updatePanel(client) {
    if (
        !panelChannelId ||
        !panelMessageId
    ) {
        return;
    }

    try {
        const channel =
            await client.channels.fetch(
                panelChannelId
            );

        if (!channel) {
            console.log(
                "[ERLC PANEL] Channel not found."
            );

            return;
        }

        const message =
            await channel.messages.fetch(
                panelMessageId
            );

        if (!message) {
            console.log(
                "[ERLC PANEL] Message not found."
            );

            return;
        }

        const components =
            await buildPanel(
                channel.guild
            );

        await message.edit({
            flags:
                MessageFlags.IsComponentsV2,

            components
        });

        console.log(
            "[ERLC PANEL] Panel updated."
        );

    } catch (error) {

        console.error(
            "[ERLC PANEL UPDATE ERROR]",
            error.message
        );
    }
}

// ======================================================
// START LIVE UPDATER
// ======================================================

function startUpdater(client) {
    if (updateInterval) {
        clearInterval(
            updateInterval
        );
    }

    updateInterval =
        setInterval(
            () => {
                updatePanel(
                    client
                );
            },
            UPDATE_INTERVAL
        );

    console.log(
        "[ERLC PANEL] Live updater started."
    );
}

// ======================================================
// COMMAND
// ======================================================

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName(
                "sessioninfopanel"
            )

            .setDescription(
                "Post the Los Angeles State Roleplay session information panel."
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    async execute(interaction) {

        try {

            // Build initial panel
            const components =
                await buildPanel(
                    interaction.guild
                );

            // Send panel
            const message =
                await interaction.channel.send({
                    flags:
                        MessageFlags.IsComponentsV2,

                    components
                });

            // Save exact location
            panelChannelId =
                interaction.channel.id;

            panelMessageId =
                message.id;

            // Start updater
            startUpdater(
                interaction.client
            );

            // Hide command response
            await interaction.reply({
                content:
                    "Session information panel posted. Live updates are enabled.",

                flags:
                    MessageFlags.Ephemeral
            });

            console.log(
                `[ERLC PANEL] Panel created: ${message.id}`
            );

        } catch (error) {

            console.error(
                "========================================"
            );

            console.error(
                "[SESSION PANEL ERROR]"
            );

            console.error(
                error
            );

            console.error(
                "========================================"
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        "I couldn't create the session panel. Check the bot console.",

                    flags:
                        MessageFlags.Ephemeral
                }).catch(
                    () => {}
                );
            }
        }
    }
};