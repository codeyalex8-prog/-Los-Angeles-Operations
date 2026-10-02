const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("promote")
        .setDescription("Promote a staff member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member being promoted.")
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("rank")
                .setDescription("The new rank.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the promotion.")
                .setRequired(true)
                .setMaxLength(500)
        ),

    async execute(interaction) {

        try {

            const target =
                interaction.options.getMember("user");

            const newRole =
                interaction.options.getRole("rank");

            const reason =
                interaction.options.getString("reason");

            if (!target) {
                return interaction.reply({
                    content: "I couldn't find that member.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!newRole) {
                return interaction.reply({
                    content: "I couldn't find that role.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    content: "You cannot promote yourself.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const issuer =
                await interaction.guild.members.fetch(
                    interaction.user.id
                );

            const botMember =
                await interaction.guild.members.fetch(
                    interaction.client.user.id
                );

            const isOwner =
                interaction.guild.ownerId === interaction.user.id;

            // ==========================================
            // ISSUER HIERARCHY
            // ==========================================

            if (!isOwner) {

                if (
                    issuer.roles.highest.position <=
                    target.roles.highest.position
                ) {
                    return interaction.reply({
                        content:
                            "You cannot promote this member because their highest role is equal to or higher than yours.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (
                    issuer.roles.highest.position <=
                    newRole.position
                ) {
                    return interaction.reply({
                        content:
                            "You cannot give someone a role that is equal to or higher than your highest role.",
                        flags: MessageFlags.Ephemeral
                    });
                }

            }

            // ==========================================
            // BOT HIERARCHY
            // ==========================================

            if (
                botMember.roles.highest.position <=
                newRole.position
            ) {
                return interaction.reply({
                    content:
                        `I can't give **${newRole.name}** because my bot role isn't above it.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // ==========================================
            // ALREADY HAS ROLE
            // ==========================================

            if (target.roles.cache.has(newRole.id)) {

                return interaction.reply({
                    content:
                        `${target} already has the **${newRole.name}** role.`,
                    flags: MessageFlags.Ephemeral
                });

            }

            // ==========================================
            // PREVIOUS HIGHEST ROLE
            // ==========================================

            const previousRole =
                target.roles.highest;

            const previousRank =
                previousRole &&
                previousRole.id !== interaction.guild.id
                    ? previousRole.name
                    : "None";

            // ==========================================
            // ADD NEW ROLE
            // ==========================================

            await target.roles.add(
                newRole,
                `Staff promotion issued by ${interaction.user.tag} | Reason: ${reason}`
            );

            // ==========================================
            // FIND GIVEAWAY EMOJI
            // ==========================================

            const giveawayEmoji =
                interaction.guild.emojis.cache.find(
                    emoji =>
                        emoji.name === "250885giveaway"
                );

            const giveaway =
                giveawayEmoji
                    ? giveawayEmoji.toString()
                    : "🎉";

            // ==========================================
            // PROMOTION PANEL
            // ==========================================

            const components = [

                {
                    type: 17,

                    components: [

                        {
                            type: 12,

                            items: [

                                {
                                    media: {
                                        url:
                                            "https://discord-webhook.com/uploads/e8be6367513bca701d4b0f07e5dfeed1.png"
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
`${giveaway} **Staff Promotion**

> **Member:** ${target}
> **New Rank:** \`${newRole.name}\`
> **Previous Rank:** \`${previousRank}\`
> **Reason:** ${reason}
> **Issued By:** ${interaction.user}
> **Date:** <t:${Math.floor(Date.now() / 1000)}:D>`
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
                                        url:
                                            "https://discord-webhook.com/uploads/8d3e65a56082c2425d8ed7a95190158f.png"
                                    }
                                }

                            ]
                        }

                    ]
                }

            ];

            await interaction.channel.send({

                flags:
                    MessageFlags.IsComponentsV2,

                components

            });

            await interaction.reply({

                content:
                    `Successfully promoted ${target} to **${newRole.name}**.`,

                flags:
                    MessageFlags.Ephemeral

            });

            console.log(
                `[PROMOTION] ${target.user.tag} promoted to ${newRole.name} by ${interaction.user.tag} | Reason: ${reason}`
            );

        } catch (error) {

            console.error(
                "========== PROMOTION ERROR =========="
            );

            console.error(error);

            console.error(
                "====================================="
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.editReply({
                    content:
                        "Something went wrong while processing the promotion. Check the bot console."
                }).catch(() => {});

            } else {

                await interaction.reply({
                    content:
                        "Something went wrong while processing the promotion. Check the bot console.",
                    flags:
                        MessageFlags.Ephemeral
                }).catch(() => {});

            }

        }

    }

};