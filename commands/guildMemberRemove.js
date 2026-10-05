const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
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

    // ======================================================
    // BUILD LEAVE PANEL
    // ======================================================

    function buildLeavePanel({
        member,
        resolved = false,
        resolver = null
    }) {
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

        const container =
            new ContainerBuilder()
                .setAccentColor(
                    resolved
                        ? 0x57F287
                        : 0xED4245
                );

        // ==================================================
        // HEADER + AVATAR
        // ==================================================

        const header =
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            resolved
                                ? "## Staff Departure — Resolved"
                                : "## Staff Departure Alert"
                        )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            resolved
                                ? "The staff departure has been reviewed and resolved."
                                : "A member has left the server while holding the monitored staff role."
                        )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(avatar)
                );

        container.addSectionComponents(header);

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ==================================================
        // MEMBER
        // ==================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    `### Member\n` +
                    `**${displayName}**\n` +
                    `@${username}\n` +
                    `\`${userId}\``
                )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ==================================================
        // STAFF ROLE
        // ==================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    `### Staff Role\n` +
                    `<@&${WATCHED_ROLE_ID}>`
                )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ==================================================
        // SERVER DATES
        // ==================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    `### Server Activity\n` +
                    `**Joined:** ${
                        joinedTimestamp
                            ? `<t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)`
                            : "Unknown"
                    }\n` +
                    `**Left:** <t:${leftTimestamp}:F> (<t:${leftTimestamp}:R>)`
                )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ==================================================
        // STATUS
        // ==================================================

        if (resolved && resolver) {

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### Status\n` +
                        `🟢 **Resolved**\n` +
                        `Resolved by **${resolver.username}**`
                    )
            );

        } else {

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### Status\n` +
                        `🔴 **Unresolved**`
                    )
            );
        }

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ==================================================
        // BUTTON
        // ==================================================

        const button =
            new ButtonBuilder()
                .setCustomId(
                    resolved
                        ? `resolved_staff_leave_${userId}`
                        : `resolve_staff_leave_${userId}`
                )
                .setLabel(
                    resolved
                        ? `Resolved by ${resolver.username}`
                        : "Resolve"
                )
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
                .setDisabled(resolved);

        const row =
            new ActionRowBuilder()
                .addComponents(button);

        container.addActionRowComponents(row);

        // ==================================================
        // FOOTER
        // ==================================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    resolved && resolver
                        ? `-# Staff Departure System • Resolved by ${resolver.username}`
                        : `-# Staff Departure System • Monitoring staff departures`
                )
        );

        return container;
    }

    // ======================================================
    // MEMBER LEAVES
    // ======================================================

    client.on(
        "guildMemberRemove",
        async member => {

            try {

                // Only trigger for the specific role
                if (
                    !member.roles.cache.has(
                        WATCHED_ROLE_ID
                    )
                ) {
                    return;
                }

                const channel =
                    member.guild.channels.cache.get(
                        ALERT_CHANNEL_ID
                    );

                if (!channel) {
                    console.error(
                        `[Leave Alert] Could not find channel ${ALERT_CHANNEL_ID}.`
                    );
                    return;
                }

                // ==================================================
                // BUILD PANEL
                // ==================================================

                const container =
                    buildLeavePanel({
                        member
                    });

                // ==================================================
                // SEND PANEL
                // ==================================================

                const message =
                    await channel.send({
                        flags:
                            MessageFlags.IsComponentsV2,
                        components: [
                            container
                        ],
                        allowedMentions: {
                            roles: [
                                PING_ROLE_ID
                            ]
                        },
                        content:
                            undefined
                    });

                // Send the role mention separately only if
                // the channel supports normal content.
                await channel.send({
                    content:
                        `<@&${PING_ROLE_ID}>`,
                    allowedMentions: {
                        roles: [
                            PING_ROLE_ID
                        ]
                    }
                });

                console.log(
                    `[Leave Alert] ${member.user.username} (${member.user.id}) left with monitored role.`
                );

                // ==================================================
                // RESOLVE COLLECTOR
                // ==================================================

                const collector =
                    message.createMessageComponentCollector({
                        filter:
                            interaction =>
                                interaction.isButton() &&
                                interaction.customId ===
                                    `resolve_staff_leave_${member.user.id}`,
                        time:
                            7 *
                            24 *
                            60 *
                            60 *
                            1000
                    });

                collector.on(
                    "collect",
                    async interaction => {

                        try {

                            const resolver =
                                interaction.user;

                            collector.stop(
                                "resolved"
                            );

                            const resolvedContainer =
                                buildLeavePanel({
                                    member,
                                    resolved: true,
                                    resolver
                                });

                            await interaction.update({
                                flags:
                                    MessageFlags.IsComponentsV2,
                                components: [
                                    resolvedContainer
                                ]
                            });

                            console.log(
                                `[Leave Alert] ${member.user.username}'s departure was resolved by ${resolver.username}.`
                            );

                        } catch (error) {

                            console.error(
                                "[Leave Alert] Resolve error:",
                                error
                            );

                        }

                    }
                );

                collector.on(
                    "end",
                    (_, reason) => {

                        if (
                            reason !==
                            "resolved"
                        ) {
                            console.log(
                                `[Leave Alert] Resolve button expired for ${member.user.username}.`
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

        }
    );

    console.log(
        "[Leave Alert] Components V2 staff departure system loaded."
    );
}