const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const WATCHED_ROLE_ID = "1555284465318764724";
const ALERT_CHANNEL_ID = "1555604204624551986";
const PING_ROLE_ID = "1555279476949258320";

const client = global.client;

if (!client) {
    console.error(
        "[Leave Alert] global.client was not found."
    );
} else {

    client.on("guildMemberRemove", async (member) => {
        try {
            // Only alert when the member had the monitored role
            if (!member.roles.cache.has(WATCHED_ROLE_ID)) {
                return;
            }

            const channel =
                member.guild.channels.cache.get(
                    ALERT_CHANNEL_ID
                );

            if (!channel) {
                console.error(
                    `[Leave Alert] Channel ${ALERT_CHANNEL_ID} was not found.`
                );
                return;
            }

            const username = member.user.username;
            const displayName =
                member.displayName ||
                member.user.globalName ||
                username;

            const userId = member.user.id;

            const avatar =
                member.user.displayAvatarURL({
                    extension: "png",
                    size: 256
                });

            const joinedTimestamp =
                member.joinedTimestamp
                    ? Math.floor(
                          member.joinedTimestamp / 1000
                      )
                    : null;

            const leftTimestamp =
                Math.floor(Date.now() / 1000);

            // ================================
            // LEAVE ALERT PANEL
            // ================================

            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setAuthor({
                    name: "Staff Departure Alert",
                    iconURL: avatar
                })
                .setThumbnail(avatar)
                .setDescription(
                    `A member has left **${member.guild.name}** while holding the monitored staff role.`
                )
                .addFields(
                    {
                        name: "Member",
                        value:
                            `**${displayName}**\n` +
                            `@${username}`,
                        inline: true
                    },
                    {
                        name: "User ID",
                        value: `\`${userId}\``,
                        inline: true
                    },
                    {
                        name: "Staff Role",
                        value:
                            `<@&${WATCHED_ROLE_ID}>`,
                        inline: true
                    },
                    {
                        name: "Joined Server",
                        value: joinedTimestamp
                            ? `<t:${joinedTimestamp}:F>\n<t:${joinedTimestamp}:R>`
                            : "Unknown",
                        inline: true
                    },
                    {
                        name: "Left Server",
                        value:
                            `<t:${leftTimestamp}:F>\n<t:${leftTimestamp}:R>`,
                        inline: true
                    },
                    {
                        name: "Status",
                        value: "🔴 **Unresolved**",
                        inline: true
                    }
                )
                .setFooter({
                    text:
                        `Staff Departure • ${username}`
                })
                .setTimestamp();

            const row =
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `resolve_staff_leave_${userId}`
                        )
                        .setLabel("Resolve")
                        .setEmoji("✅")
                        .setStyle(
                            ButtonStyle.Success
                        )
                );

            // ================================
            // SEND ALERT
            // ================================

            const message =
                await channel.send({
                    content:
                        `<@&${PING_ROLE_ID}>`,
                    embeds: [embed],
                    components: [row],
                    allowedMentions: {
                        roles: [PING_ROLE_ID]
                    }
                });

            console.log(
                `[Leave Alert] ${username} (${userId}) left while holding the monitored role.`
            );

            // ================================
            // RESOLVE BUTTON
            // ================================

            const collector =
                message.createMessageComponentCollector({
                    filter: (interaction) =>
                        interaction.isButton() &&
                        interaction.customId ===
                            `resolve_staff_leave_${userId}`,
                    time:
                        7 * 24 * 60 * 60 * 1000
                });

            collector.on(
                "collect",
                async (interaction) => {
                    try {
                        const resolver =
                            interaction.user;

                        collector.stop(
                            "resolved"
                        );

                        const resolvedEmbed =
                            EmbedBuilder.from(
                                embed
                            )
                                .setColor(
                                    0x57F287
                                )
                                .setDescription(
                                    `A staff member left **${member.guild.name}** while holding the monitored role.\n\n` +
                                    `This departure alert has been resolved.`
                                )
                                .setFields(
                                    {
                                        name: "Member",
                                        value:
                                            `**${displayName}**\n` +
                                            `@${username}`,
                                        inline: true
                                    },
                                    {
                                        name: "User ID",
                                        value:
                                            `\`${userId}\``,
                                        inline: true
                                    },
                                    {
                                        name: "Staff Role",
                                        value:
                                            `<@&${WATCHED_ROLE_ID}>`,
                                        inline: true
                                    },
                                    {
                                        name: "Joined Server",
                                        value:
                                            joinedTimestamp
                                                ? `<t:${joinedTimestamp}:F>\n<t:${joinedTimestamp}:R>`
                                                : "Unknown",
                                        inline: true
                                    },
                                    {
                                        name: "Left Server",
                                        value:
                                            `<t:${leftTimestamp}:F>\n<t:${leftTimestamp}:R>`,
                                        inline: true
                                    },
                                    {
                                        name: "Status",
                                        value:
                                            `🟢 **Resolved**\nby ${resolver}`,
                                        inline: true
                                    }
                                )
                                .setFooter({
                                    text:
                                        `Resolved by ${resolver.username} • ${resolver.id}`
                                })
                                .setTimestamp();

                        const resolvedRow =
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId(
                                        `resolved_staff_leave_${userId}`
                                    )
                                    .setLabel(
                                        `Resolved by ${resolver.username}`
                                    )
                                    .setEmoji("✅")
                                    .setStyle(
                                        ButtonStyle.Success
                                    )
                                    .setDisabled(true)
                            );

                        await interaction.update({
                            embeds: [
                                resolvedEmbed
                            ],
                            components: [
                                resolvedRow
                            ]
                        });

                        console.log(
                            `[Leave Alert] Alert for ${username} resolved by ${resolver.username}.`
                        );

                    } catch (error) {
                        console.error(
                            "[Leave Alert] Resolve error:",
                            error
                        );
                    }
                }
            );

        } catch (error) {
            console.error(
                "[Leave Alert] Error:",
                error
            );
        }
    });

    console.log(
        "[Leave Alert] Staff departure system loaded."
    );
}