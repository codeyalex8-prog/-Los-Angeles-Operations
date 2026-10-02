const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("infract")
        .setDescription("Issue a staff infraction.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The staff member receiving the infraction.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("punishment")
                .setDescription("Select the punishment.")
                .setRequired(true)
                .addChoices(
                    { name: "Warning 1", value: "Warning 1" },
                    { name: "Warning 2", value: "Warning 2" },
                    { name: "Strike 1", value: "Strike 1" },
                    { name: "Strike 2", value: "Strike 2" },
                    { name: "Staff Blacklist", value: "Staff Blacklist" },
                    { name: "Termination", value: "Termination" },
                    { name: "Ticket Blacklist", value: "Ticket Blacklist" },
                    { name: "Under Investigation", value: "Under Investigation" }
                )
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("Reason for the infraction.")
                .setRequired(true)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option
                .setName("appealable")
                .setDescription("Is this infraction appealable?")
                .setRequired(true)
                .addChoices(
                    { name: "Yes", value: "Yes" },
                    { name: "No", value: "No" }
                )
        ),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.reply({
                    content: "You don't have permission to issue staff infractions.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const target = interaction.options.getMember("user");
            const punishment = interaction.options.getString("punishment");
            const reason = interaction.options.getString("reason");
            const appealable = interaction.options.getString("appealable");

            if (!target) {
                return interaction.reply({
                    content: "I couldn't find that member.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    content: "You cannot issue an infraction to yourself.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (target.user.bot) {
                return interaction.reply({
                    content: "You cannot issue an infraction to a bot.",
                    flags: MessageFlags.Ephemeral
                });
            }

            // ======================================================
            // ROLE NAME MAPPING
            // ======================================================

            const roleNames = {
                "Warning 1": "Warning 1",
                "Warning 2": "Warning 2",
                "Strike 1": "Strike 1",
                "Strike 2": "Strike 2",
                "Staff Blacklist": "Staff Blacklist",
                "Termination": "Terminated",
                "Ticket Blacklist": "Ticket Blacklist",
                "Under Investigation": "Under Investigation"
            };

            const roleName = roleNames[punishment];

            // ======================================================
            // FIND ROLE
            // ======================================================

            const punishmentRole =
                interaction.guild.roles.cache.find(
                    role => role.name === roleName
                );

            if (!punishmentRole) {
                return interaction.reply({
                    content:
                        `I couldn't find the role **${roleName}**. Make sure the role name is exactly correct.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // ======================================================
            // HIERARCHY CHECK
            // ======================================================

            if (
                punishmentRole.position >=
                interaction.guild.members.me.roles.highest.position
            ) {
                return interaction.reply({
                    content:
                        `I can't give **${punishmentRole.name}** because that role is higher than or equal to my highest role.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (
                target.roles.highest.position >=
                interaction.member.roles.highest.position &&
                interaction.guild.ownerId !== interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        "You cannot infract someone whose highest role is equal to or higher than yours.",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (
                target.roles.highest.position >=
                interaction.guild.members.me.roles.highest.position
            ) {
                return interaction.reply({
                    content:
                        "I cannot manage this member because their highest role is equal to or higher than my highest role.",
                    flags: MessageFlags.Ephemeral
                });
            }

            // ======================================================
            // RESPOND IMMEDIATELY
            // ======================================================

            await interaction.reply({
                content: "Issuing staff infraction...",
                flags: MessageFlags.Ephemeral
            });

            // ======================================================
            // ADD PUNISHMENT ROLE
            // ======================================================

            await target.roles.add(
                punishmentRole,
                `Staff infraction: ${punishment} | Issued by ${interaction.user.tag}`
            );

            // ======================================================
            // EMOJI
            // ======================================================

            const gavelEmoji =
                interaction.guild.emojis.cache.find(
                    emoji => emoji.name === "998896gavel"
                );

            const gavel =
                gavelEmoji
                    ? gavelEmoji.toString()
                    : "⚖️";

            // ======================================================
            // TIMESTAMP
            // ======================================================

            const timestamp =
                Math.floor(Date.now() / 1000);

            // ======================================================
            // PANEL
            // ======================================================

            const panel = [
                {
                    type: 17,

                    components: [
                        {
                            type: 12,

                            items: [
                                {
                                    media: {
                                        url:
                                            "https://discord-webhook.com/uploads/4a80eeecef55aca35427309bff59de5c.png"
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
`${gavel} **Staff Infraction**

> **Member:** <@${target.id}>
> **Infraction:** ${punishment}
> **Reason:** ${reason.replace(/\n/g, "\n> ")}
> **Issued By:** ${interaction.user}
> **Appealable:** ${appealable}
> **Date:** <t:${timestamp}:D>`
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

            // ======================================================
            // SEND PANEL
            // ======================================================

            await interaction.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: panel
            });

            // ======================================================
            // DM MEMBER
            // ======================================================

            await target.send({
                content:
`# Staff Infraction

You have received a **${punishment}** within **Los Angeles State Roleplay**.

> **Reason:** ${reason}
> **Issued By:** ${interaction.user}
> **Appealable:** ${appealable}
> **Date:** <t:${timestamp}:D>`

            }).catch(() => {});

            // ======================================================
            // FINISHED
            // ======================================================

            await interaction.editReply({
                content:
                    `Successfully issued **${punishment}** to ${target}.`
            });

            console.log(
                `[INFRACTION] ${target.user.tag} received ${punishment} (${roleName}) from ${interaction.user.tag}`
            );

        } catch (error) {
            console.error("");
            console.error("========== INFRACTION ERROR ==========");
            console.error(error);
            console.error("======================================");
            console.error("");

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content:
                        "The infraction failed. Check the VS Code terminal for the error."
                }).catch(() => {});
            } else {
                await interaction.reply({
                    content:
                        "The infraction failed. Check the VS Code terminal for the error.",
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
};