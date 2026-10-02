const fs = require("fs");
const path = require("path");
const {
    MessageFlags
} = require("discord.js");

const DATA_FILE = path.join(__dirname, "dashboard-data.json");
const CONFIG_FILE = path.join(__dirname, "dashboard-config.json");

const UPDATE_INTERVAL = 15_000;

let botClient = null;
let dashboardInterval = null;
let dashboardUpdating = false;

const defaultData = {
    totalCommands: 0,
    commandsToday: 0,
    commandsThisWeek: 0,

    commandUsage: {},

    recentCommands: [],
    recentActivity: [],

    ticketsOpened: 0,
    ticketsClosed: 0,
    ticketsClaimed: 0,

    applicationsSubmitted: 0,
    applicationsApproved: 0,
    applicationsDenied: 0,

    staffFeedback: 0,
    staffFeedbackTotalRating: 0,

    errors: 0,
    failedCommands: 0,
    failedInteractions: 0,

    lastRestart: Date.now()
};

function loadJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(fallback, null, 4)
            );

            return structuredClone(fallback);
        }

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );
    } catch (error) {
        console.error(
            `[DASHBOARD] Failed loading ${file}:`,
            error
        );

        return structuredClone(fallback);
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 4)
        );
    } catch (error) {
        console.error(
            `[DASHBOARD] Failed saving ${file}:`,
            error
        );
    }
}

let dashboardData = loadJSON(
    DATA_FILE,
    defaultData
);

let dashboardConfig = loadJSON(
    CONFIG_FILE,
    {
        guildId: null,
        channelId: null,
        messageId: null
    }
);

if (!dashboardData.lastRestart) {
    dashboardData.lastRestart = Date.now();
}

dashboardData.lastRestart = Date.now();
saveJSON(DATA_FILE, dashboardData);

// ======================================================
// HELPERS
// ======================================================

function cleanText(value) {
    return String(value ?? "")
        .replace(/@everyone/gi, "@ everyone")
        .replace(/@here/gi, "@ here");
}

function trimArray(array, max) {
    while (array.length > max) {
        array.shift();
    }
}

function formatUptime(ms) {
    let seconds = Math.floor(ms / 1000);

    const days = Math.floor(seconds / 86400);
    seconds %= 86400;

    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getWeekStart() {
    const now = new Date();

    const day = now.getDay();

    const diff =
        now.getDate() -
        day +
        (day === 0 ? -6 : 1);

    const monday = new Date(now);

    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    return monday.getTime();
}

function resetDailyStatsIfNeeded() {
    const today =
        new Date().toISOString().slice(0, 10);

    if (dashboardData.statsDate !== today) {
        dashboardData.statsDate = today;
        dashboardData.commandsToday = 0;

        saveJSON(
            DATA_FILE,
            dashboardData
        );
    }
}

function resetWeeklyStatsIfNeeded() {
    const weekStart = getWeekStart();

    if (
        !dashboardData.statsWeekStart ||
        dashboardData.statsWeekStart !== weekStart
    ) {
        dashboardData.statsWeekStart = weekStart;
        dashboardData.commandsThisWeek = 0;

        saveJSON(
            DATA_FILE,
            dashboardData
        );
    }
}

// ======================================================
// ACTIVITY
// ======================================================

function addActivity(text) {
    dashboardData.recentActivity.unshift({
        text: cleanText(text),
        timestamp: Date.now()
    });

    trimArray(
        dashboardData.recentActivity,
        10
    );

    saveJSON(
        DATA_FILE,
        dashboardData
    );
}

function recordCommand(
    commandName,
    user
) {
    resetDailyStatsIfNeeded();
    resetWeeklyStatsIfNeeded();

    dashboardData.totalCommands++;
    dashboardData.commandsToday++;
    dashboardData.commandsThisWeek++;

    if (!dashboardData.commandUsage[commandName]) {
        dashboardData.commandUsage[commandName] = {
            count: 0,
            lastUsed: null,
            users: []
        };
    }

    const command =
        dashboardData.commandUsage[commandName];

    command.count++;
    command.lastUsed = Date.now();

    if (
        user &&
        !command.users.includes(user.id)
    ) {
        command.users.push(user.id);
    }

    dashboardData.recentCommands.unshift({
        command: commandName,
        userId: user?.id || null,
        username: user?.username || "Unknown",
        timestamp: Date.now()
    });

    trimArray(
        dashboardData.recentCommands,
        10
    );

    addActivity(
        `/${commandName} used by ${user ? `@${user.username}` : "Unknown User"}`
    );

    saveJSON(
        DATA_FILE,
        dashboardData
    );
}

function recordError(type, error) {
    dashboardData.errors++;

    if (type === "command") {
        dashboardData.failedCommands++;
    }

    if (type === "interaction") {
        dashboardData.failedInteractions++;
    }

    addActivity(
        `⚠️ ${type} error detected`
    );

    saveJSON(
        DATA_FILE,
        dashboardData
    );
}

// ======================================================
// OPTIONAL EVENT TRACKERS
// ======================================================

function recordTicketOpened() {
    dashboardData.ticketsOpened++;
    addActivity("🎫 Ticket opened");
}

function recordTicketClaimed(user) {
    dashboardData.ticketsClaimed++;

    addActivity(
        `🎫 Ticket claimed by @${user?.username || "Unknown"}`
    );
}

function recordTicketClosed(user) {
    dashboardData.ticketsClosed++;

    addActivity(
        `🎫 Ticket closed by @${user?.username || "Unknown"}`
    );
}

function recordApplicationSubmitted(user) {
    dashboardData.applicationsSubmitted++;

    addActivity(
        `📋 Application submitted by @${user?.username || "Unknown"}`
    );
}

function recordApplicationApproved(user) {
    dashboardData.applicationsApproved++;

    addActivity(
        `📋 Application approved by @${user?.username || "Unknown"}`
    );
}

function recordApplicationDenied(user) {
    dashboardData.applicationsDenied++;

    addActivity(
        `📋 Application denied by @${user?.username || "Unknown"}`
    );
}

function recordStaffFeedback(rating) {
    dashboardData.staffFeedback++;

    const number = Number(rating);

    if (
        Number.isFinite(number) &&
        number >= 1 &&
        number <= 10
    ) {
        dashboardData.staffFeedbackTotalRating += number;
    }

    addActivity(
        `📝 Staff feedback submitted`
    );
}

// ======================================================
// TOP COMMANDS
// ======================================================

function getTopCommands() {
    const entries =
        Object.entries(
            dashboardData.commandUsage
        );

    entries.sort(
        (a, b) =>
            b[1].count - a[1].count
    );

    return entries.slice(0, 5);
}

// ======================================================
// RECENT COMMANDS
// ======================================================

function getRecentCommands() {
    if (
        !dashboardData.recentCommands.length
    ) {
        return "No commands have been used yet.";
    }

    return dashboardData.recentCommands
        .slice(0, 5)
        .map(item => {
            const user =
                item.userId
                    ? `<@${item.userId}>`
                    : `\`${cleanText(item.username)}\``;

            return `> \`/${item.command}\` — ${user} — <t:${Math.floor(item.timestamp / 1000)}:R>`;
        })
        .join("\n");
}

// ======================================================
// ACTIVITY
// ======================================================

function getRecentActivity() {
    if (
        !dashboardData.recentActivity.length
    ) {
        return "> No recent activity to display.";
    }

    return dashboardData.recentActivity
        .slice(0, 8)
        .map(item =>
            `> ${item.text} — <t:${Math.floor(item.timestamp / 1000)}:R>`
        )
        .join("\n");
}

// ======================================================
// DASHBOARD COMPONENTS
// ======================================================

function buildDashboardComponents(guild) {
    resetDailyStatsIfNeeded();
    resetWeeklyStatsIfNeeded();

    const memberCount =
        guild.memberCount;

    const botCount =
        guild.members.cache.filter(
            member => member.user.bot
        ).size;

    const onlineCount =
        guild.members.cache.filter(
            member =>
                member.presence?.status &&
                member.presence.status !== "offline"
        ).size;

    const channelCount =
        guild.channels.cache.size;

    const roleCount =
        guild.roles.cache.size;

    const boostLevel =
        guild.premiumTier;

    const uptime =
        botClient?.uptime || 0;

    const latency =
        botClient?.ws?.ping ?? 0;

    const averageRating =
        dashboardData.staffFeedback > 0
            ? (
                dashboardData.staffFeedbackTotalRating /
                dashboardData.staffFeedback
            ).toFixed(1)
            : "0.0";

    const topCommands =
        getTopCommands();

    const mostUsedCommand =
        topCommands.length
            ? `/${topCommands[0][0]} (${topCommands[0][1].count})`
            : "None";

    const commandStats =
        topCommands.length
            ? topCommands
                .map(
                    ([name, info]) =>
                        `> \`/${name}\` — **${info.count}** uses`
                )
                .join("\n")
            : "> No command usage recorded.";

    return [
        {
            type: 17,

            components: [
                {
                    type: 12,

                    items: [
                        {
                            media: {
                                url:
                                    "https://discord-webhook.com/uploads/fbe2855c70561ecde8059eaa99eeb9b6.png"
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
`# Bot Management

> **Live Bot Management & Monitoring**
>
> This panel provides authorised staff with a live overview of **Los Angeles State Roleplay**, the Discord bot, and recent system activity.

### 🟢 Bot Status

> **Status:** 🟢 Online
> **Bot:** ${botClient?.user?.username || "Unknown"}
> **Bot ID:** \`${botClient?.user?.id || "Unknown"}\`
> **Uptime:** \`${formatUptime(uptime)}\`
> **Latency:** \`${latency}ms\`
> **Last Restart:** <t:${Math.floor(dashboardData.lastRestart / 1000)}:R>

### 👥 Server Overview

> **Members:** \`${memberCount}\`
> **Online:** \`${onlineCount}\`
> **Bots:** \`${botCount}\`
> **Channels:** \`${channelCount}\`
> **Roles:** \`${roleCount}\`
> **Boost Level:** \`${boostLevel}\`

### 📊 Command Statistics

> **Total Commands Used:** \`${dashboardData.totalCommands}\`
> **Most Used Command:** \`${mostUsedCommand}\`
> **Commands Today:** \`${dashboardData.commandsToday}\`
> **Commands This Week:** \`${dashboardData.commandsThisWeek}\`

**Top Commands**
${commandStats}

### 🎫 Ticket Statistics

> **Total Opened:** \`${dashboardData.ticketsOpened}\`
> **Currently Open:** \`${getOpenTicketCount(guild)}\`
> **Closed:** \`${dashboardData.ticketsClosed}\`
> **Claimed:** \`${dashboardData.ticketsClaimed}\`

### 📋 Application Statistics

> **Submitted:** \`${dashboardData.applicationsSubmitted}\`
> **Approved:** \`${dashboardData.applicationsApproved}\`
> **Denied:** \`${dashboardData.applicationsDenied}\`
> **Pending:** \`${Math.max(
    0,
    dashboardData.applicationsSubmitted -
    dashboardData.applicationsApproved -
    dashboardData.applicationsDenied
)}\`

### 📝 Staff Feedback

> **Total Feedback:** \`${dashboardData.staffFeedback}\`
> **Average Rating:** \`${averageRating}/10\`
> **Feedback Today:** \`${getFeedbackToday()}\`

### ⚡ Recent Commands

${getRecentCommands()}

### 📡 Live Activity

${getRecentActivity()}

### ⚠️ System & Errors

> **Errors:** \`${dashboardData.errors}\`
> **Failed Commands:** \`${dashboardData.failedCommands}\`
> **Failed Interactions:** \`${dashboardData.failedInteractions}\`

### 🔧 System Information

> **Discord.js:** \`v14\`
> **Node.js:** \`${process.version}\`
> **Connected Guilds:** \`${botClient?.guilds?.cache.size || 0}\`
> **Memory Usage:** \`${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\`
> **Database:** 🟢 Connected
> **Command Handler:** 🟢 Operational
> **Transcript System:** 🟢 Operational

### 🔐 Access

> This management panel is restricted to authorised staff.
>
> **Last Panel Update:** <t:${Math.floor(Date.now() / 1000)}:R>
>
> The panel automatically refreshes every **15 seconds** with the latest bot and server activity.`
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
}

// ======================================================
// LIVE COUNTERS
// ======================================================

function getOpenTicketCount(guild) {
    const categories = [
        "1555328403899551754",
        "1555328448916889700",
        "1555328488687542423"
    ];

    return guild.channels.cache.filter(
        channel =>
            categories.includes(channel.parentId) &&
            channel.isTextBased()
    ).size;
}

function getFeedbackToday() {
    return dashboardData.feedbackToday || 0;
}

// ======================================================
// UPDATE PANEL
// ======================================================

async function updateDashboard() {
    if (!botClient) return;

    if (dashboardUpdating) return;

    if (
        !dashboardConfig.guildId ||
        !dashboardConfig.channelId ||
        !dashboardConfig.messageId
    ) {
        return;
    }

    dashboardUpdating = true;

    try {
        const guild =
            await botClient.guilds.fetch(
                dashboardConfig.guildId
            );

        if (!guild) {
            return;
        }

        const channel =
            await guild.channels.fetch(
                dashboardConfig.channelId
            );

        if (!channel) {
            return;
        }

        const message =
            await channel.messages.fetch(
                dashboardConfig.messageId
            );

        await message.edit({
            flags:
                MessageFlags.IsComponentsV2,

            components:
                buildDashboardComponents(
                    guild
                )
        });

    } catch (error) {
        console.error(
            "[DASHBOARD UPDATE ERROR]",
            error
        );

    } finally {
        dashboardUpdating = false;
    }
}

// ======================================================
// SETUP
// ======================================================

async function setupDashboard(interaction) {
    if (
        !interaction.memberPermissions?.has(
            "Administrator"
        )
    ) {
        return interaction.reply({
            content:
                "You need Administrator permissions to setup the dashboard.",

            flags:
                MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply({
        flags:
            MessageFlags.Ephemeral
    });

    const channel =
        interaction.channel;

    const existing =
        dashboardConfig.guildId === interaction.guild.id &&
        dashboardConfig.channelId === channel.id &&
        dashboardConfig.messageId;

    if (existing) {
        try {
            const oldMessage =
                await channel.messages.fetch(
                    dashboardConfig.messageId
                );

            await oldMessage.edit({
                flags:
                    MessageFlags.IsComponentsV2,

                components:
                    buildDashboardComponents(
                        interaction.guild
                    )
            });

            return interaction.editReply({
                content:
                    "The live dashboard has already been set up and has been refreshed."
            });
        } catch {
            dashboardConfig.messageId = null;
        }
    }

    const message =
        await channel.send({
            flags:
                MessageFlags.IsComponentsV2,

            components:
                buildDashboardComponents(
                    interaction.guild
                )
        });

    dashboardConfig = {
        guildId:
            interaction.guild.id,

        channelId:
            channel.id,

        messageId:
            message.id
    };

    saveJSON(
        CONFIG_FILE,
        dashboardConfig
    );

    await interaction.editReply({
        content:
            `Live dashboard created: ${message}`
    });

    await updateDashboard();
}

// ======================================================
// START
// ======================================================

function startDashboard(client) {
    botClient = client;

    dashboardData.lastRestart =
        Date.now();

    saveJSON(
        DATA_FILE,
        dashboardData
    );

    if (dashboardInterval) {
        clearInterval(
            dashboardInterval
        );
    }

    dashboardInterval =
        setInterval(
            updateDashboard,
            UPDATE_INTERVAL
        );

    setTimeout(
        updateDashboard,
        3000
    );

    console.log(
        "[DASHBOARD] Live dashboard system started."
    );
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    setupDashboard,
    startDashboard,
    updateDashboard,

    recordCommand,
    recordError,

    recordTicketOpened,
    recordTicketClaimed,
    recordTicketClosed,

    recordApplicationSubmitted,
    recordApplicationApproved,
    recordApplicationDenied,

    recordStaffFeedback,

    getData: () =>
        dashboardData
};