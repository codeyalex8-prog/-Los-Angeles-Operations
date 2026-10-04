require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    MessageFlags,
    ChannelType,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    AttachmentBuilder,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");
const { handleERLCMessage } = require("./commands/erlc");
const discordTranscripts = require("discord-html-transcripts");
const fs = require("fs");
const path = require("path");

// ======================================================
// SINGLE INSTANCE LOCK
// ======================================================
//
// Stops a second copy of the bot from starting on the same
// machine. Two copies running at once is what causes double
// DMs and double result messages.
//
// If the bot says another instance is running but you are
// sure it isn't, delete "bot-instance.lock" and start again.
//
// ======================================================

const LOCK_FILE =
    path.join(__dirname, "bot-instance.lock");

function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === "EPERM";
    }
}

(function acquireInstanceLock() {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            const oldPid =
                Number(
                    fs.readFileSync(
                        LOCK_FILE,
                        "utf8"
                    ).trim()
                );

            if (
                oldPid &&
                oldPid !== process.pid &&
                isProcessRunning(oldPid)
            ) {
                console.error(
                    `[LOCK] Another copy of this bot is already running (PID ${oldPid}). Stop it first, then start this one. Exiting.`
                );

                process.exit(1);
            }
        }

        fs.writeFileSync(
            LOCK_FILE,
            String(process.pid)
        );
    } catch (error) {
        console.error(
            "[LOCK] Could not create lock file:",
            error
        );
    }
})();

function releaseInstanceLock() {
    try {
        if (
            fs.existsSync(LOCK_FILE) &&
            fs.readFileSync(
                LOCK_FILE,
                "utf8"
            ).trim() === String(process.pid)
        ) {
            fs.unlinkSync(LOCK_FILE);
        }
    } catch {}
}

process.on("exit", releaseInstanceLock);

process.on("SIGINT", () => process.exit(0));

process.on("SIGTERM", () => process.exit(0));

// ======================================================
// CLIENT
// ======================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

client.commands = new Collection();

// ======================================================
// COMMAND LOADING
// ======================================================

const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
    for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))) {
        try {
            const command = require(path.join(commandsPath, file));

            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`[COMMAND] Loaded /${command.data.name}`);
            }
        } catch (error) {
            console.error(`[COMMAND ERROR] Failed loading ${file}:`, error);
        }
    }
}

// ======================================================
// CONFIG
// ======================================================

const STAFF_FEEDBACK_CHANNEL_ID = "1555276650248409269";

const APPLICATION_CATEGORY_ID = "1555350993628307486";
const APPLICATION_REVIEW_CHANNEL_ID = "1555354725136859206";
const COMPLETED_APPLICATION_CHANNEL_ID = "1555356148335517777";
const RESULTS_CHANNEL_ID = "1555276174257553490";
const TRAINEE_ROLE_ID = "1555280978895962285";
const APPLICATION_REVIEW_ROLE_ID = "1555284465318764724";

const GENERAL_CATEGORY_ID = "1555328403899551754";
const HIGH_RANK_CATEGORY_ID = "1555328448916889700";
const DEPARTMENT_CATEGORY_ID = "1555328488687542423";

const TICKET_LOG_CHANNEL_ID = "1555604116804468746";

const APPLICATION_TIMEOUT = 30 * 60 * 1000;

const MSK_API_URL =
    process.env.MSK_API_URL || "https://www.msk-scripts.de";

const MSK_API_KEY =
    process.env.MSK_API_KEY || "";

// ======================================================
// MANAGEMENT DASHBOARD CONFIG
// ======================================================

// Optional:
// Put the channel ID in .env as:
//
// MANAGEMENT_CHANNEL_ID=123456789012345678
//
// If the panel is created with /management, the bot automatically
// remembers the channel/message in management-dashboard.json.

const MANAGEMENT_ROLE_ID =
    process.env.MANAGEMENT_ROLE_ID || "";

const MANAGEMENT_DATA_FILE =
    path.join(__dirname, "management-dashboard.json");

const MANAGEMENT_STATS_FILE =
    path.join(__dirname, "management-stats.json");

const DASHBOARD_UPDATE_INTERVAL = 10 * 1000;

// ======================================================
// IMAGES
// ======================================================

// NOTE: this TOP_IMAGE link is the "Guidelines" banner.
// For the application panels, set APPLICATION_TOP_IMAGE in
// your .env, or drop application-top.png into ./images/
const TOP_IMAGE =
    "https://discord-webhook.com/uploads/62dfbd3e742460896e60890a80b79a6c.png";

const BOTTOM_IMAGE =
    "https://discord-webhook.com/uploads/bb5f14a71e4668885d2c0f6da52caa20.png";

const RESULTS_IMAGE =
    "https://discord-webhook.com/uploads/921574de45f213177862c9fe089123f9.png";

const RESULTS_IMAGE_PROXY =
    "https://images-ext-1.discordapp.net/external/_dRP0YozvkfUwpCYLHJrZDaQBuT4-9sUsxGGPjw_y1w/https/discord-webhook.com/uploads/921574de45f213177862c9fe089123f9.png?format=webp&quality=lossless&width=2048&height=684";

// ======================================================
// APPLICATION IMAGE LOADER
// ======================================================
//
// Instead of relying on Discord to hotlink the images from an
// external host, the bot loads them itself and uploads them to
// Discord as attachments (attachment://file.png).
//
// Load order for every image:
//   1. Local file in ./images/ (application-top.png, etc.)
//   2. Download from the URL (.env override or default)
//   3. Download from the fallback URL (if one exists)
//   4. If everything fails, the plain URL is used as a last resort
//
// Optional .env overrides:
//   APPLICATION_TOP_IMAGE=https://...
//   APPLICATION_BOTTOM_IMAGE=https://...
//   APPLICATION_RESULTS_IMAGE=https://...
//
// ======================================================

const IMAGE_DIR =
    path.join(__dirname, "images");

const IMAGE_SOURCES = {
    top: {
        base: "application-top",
        url:
            process.env.APPLICATION_TOP_IMAGE ||
            TOP_IMAGE
    },

    bottom: {
        base: "application-bottom",
        url:
            process.env.APPLICATION_BOTTOM_IMAGE ||
            BOTTOM_IMAGE
    },

    results: {
        base: "application-results",
        url:
            process.env.APPLICATION_RESULTS_IMAGE ||
            RESULTS_IMAGE,

        fallbackUrl:
            process.env.APPLICATION_RESULTS_IMAGE
                ? undefined
                : RESULTS_IMAGE_PROXY
    }
};

const imageCache = {};

let lastImageLoadAttempt = 0;

const IMAGE_RETRY_DELAY = 60 * 1000;

function detectImageExtension(buffer) {
    if (!buffer || buffer.length < 12) {
        return null;
    }

    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return "png";
    }

    if (
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
    ) {
        return "jpg";
    }

    if (buffer.toString("ascii", 0, 4) === "GIF8") {
        return "gif";
    }

    if (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return "webp";
    }

    return null;
}

async function loadSingleImage(key) {
    const source = IMAGE_SOURCES[key];

    try {
        // 1. Local file

        for (const ext of ["png", "jpg", "jpeg", "webp", "gif"]) {
            const filePath =
                path.join(IMAGE_DIR, `${source.base}.${ext}`);

            if (!fs.existsSync(filePath)) {
                continue;
            }

            const buffer =
                fs.readFileSync(filePath);

            const detected =
                detectImageExtension(buffer);

            if (detected) {
                imageCache[key] = {
                    buffer,
                    name: `${source.base}.${detected}`
                };

                console.log(
                    `[IMAGES] Loaded "${key}" from local file ${source.base}.${ext}`
                );

                return true;
            }
        }

        // 2. Download

        const urls =
            [source.url, source.fallbackUrl].filter(Boolean);

        for (const url of urls) {
            try {
                const response =
                    await fetch(url, {
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",

                            "Accept":
                                "image/*,*/*;q=0.8"
                        },

                        signal:
                            AbortSignal.timeout(10000)
                    });

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }

                const buffer =
                    Buffer.from(
                        await response.arrayBuffer()
                    );

                const detected =
                    detectImageExtension(buffer);

                if (!detected) {
                    throw new Error(
                        "Response was not a valid image"
                    );
                }

                imageCache[key] = {
                    buffer,
                    name: `${source.base}.${detected}`
                };

                console.log(
                    `[IMAGES] Downloaded "${key}" from ${url}`
                );

                return true;
            } catch (error) {
                console.error(
                    `[IMAGES] Could not load "${key}" from ${url}:`,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error(
            `[IMAGES] Unexpected error loading "${key}":`,
            error
        );
    }

    return false;
}

async function loadApplicationImages(force = false) {
    const missing =
        Object.keys(IMAGE_SOURCES).filter(
            key => !imageCache[key]
        );

    if (!missing.length) {
        return;
    }

    if (
        !force &&
        Date.now() - lastImageLoadAttempt <
            IMAGE_RETRY_DELAY
    ) {
        return;
    }

    lastImageLoadAttempt =
        Date.now();

    await Promise.all(
        missing.map(loadSingleImage)
    );
}

// useAttachments = true  -> attachment://file.png (uploaded by the bot)
// useAttachments = false -> the plain image link
function applicationImageUrl(key, useAttachments = true) {
    const cached =
        imageCache[key];

    if (useAttachments && cached) {
        return `attachment://${cached.name}`;
    }

    const source =
        IMAGE_SOURCES[key];

    return source.fallbackUrl || source.url;
}

function applicationImageFiles(...keys) {
    return keys
        .filter(key => imageCache[key])
        .map(
            key =>
                new AttachmentBuilder(
                    imageCache[key].buffer,
                    {
                        name: imageCache[key].name
                    }
                )
        );
}

// Sends a Components V2 panel with the uploaded images.
// If that fails (for example the bot is missing the
// Attach Files permission), it retries using plain image links
// so the panel still gets posted.
async function sendApplicationPanel(
    channel,
    imageKeys,
    buildComponents
) {
    const files =
        applicationImageFiles(...imageKeys);

    try {
        return await channel.send({
            flags:
                MessageFlags.IsComponentsV2,

            files,

            components:
                buildComponents(true)
        });
    } catch (error) {
        console.error(
            `[APPLICATION PANEL] Sending to channel ${channel.id} with uploaded images failed:`,
            error.message
        );

        if (!files.length) {
            throw error;
        }

        console.log(
            `[APPLICATION PANEL] Retrying channel ${channel.id} with plain image links...`
        );
    }

    return channel.send({
        flags:
            MessageFlags.IsComponentsV2,

        components:
            buildComponents(false)
    });
}

// ======================================================
// STORAGE
// ======================================================

const applications = new Map();
const reviewedApplications = new Set();

const TICKET_COUNTER_FILE =
    path.join(__dirname, "ticket-log-counter.json");

// ======================================================
// MANAGEMENT STATISTICS
// ======================================================

const defaultManagementStats = {
    commands: {},
    totalCommands: 0,

    recentCommands: [],

    recentActivity: [],

    tickets: {
        total: 0,
        opened: 0,
        claimed: 0,
        closed: 0
    },

    applications: {
        submitted: 0,
        approved: 0,
        denied: 0
    },

    feedback: {
        total: 0,
        today: 0,
        ratings: []
    },

    errors: 0,
    failedCommands: 0,
    failedInteractions: 0,

    lastRestart: Date.now()
};

function loadManagementStats() {
    try {
        if (!fs.existsSync(MANAGEMENT_STATS_FILE)) {
            fs.writeFileSync(
                MANAGEMENT_STATS_FILE,
                JSON.stringify(defaultManagementStats, null, 4)
            );

            return JSON.parse(
                JSON.stringify(defaultManagementStats)
            );
        }

        const saved =
            JSON.parse(
                fs.readFileSync(
                    MANAGEMENT_STATS_FILE,
                    "utf8"
                )
            );

        return {
            ...defaultManagementStats,
            ...saved,
            commands: saved.commands || {},
            recentCommands: saved.recentCommands || [],
            recentActivity: saved.recentActivity || [],
            tickets: {
                ...defaultManagementStats.tickets,
                ...(saved.tickets || {})
            },
            applications: {
                ...defaultManagementStats.applications,
                ...(saved.applications || {})
            },
            feedback: {
                ...defaultManagementStats.feedback,
                ...(saved.feedback || {})
            }
        };
    } catch (error) {
        console.error(
            "[MANAGEMENT] Failed loading stats:",
            error
        );

        return JSON.parse(
            JSON.stringify(defaultManagementStats)
        );
    }
}

let managementStats =
    loadManagementStats();

function saveManagementStats() {
    try {
        fs.writeFileSync(
            MANAGEMENT_STATS_FILE,
            JSON.stringify(
                managementStats,
                null,
                4
            )
        );
    } catch (error) {
        console.error(
            "[MANAGEMENT] Failed saving stats:",
            error
        );
    }
}

function addManagementActivity(activity) {
    managementStats.recentActivity.unshift({
        text: activity,
        timestamp: Date.now()
    });

    managementStats.recentActivity =
        managementStats.recentActivity.slice(
            0,
            10
        );

    saveManagementStats();

    updateManagementDashboard();
}

function trackCommand(
    commandName,
    user
) {
    managementStats.totalCommands++;

    managementStats.commands[commandName] =
        (managementStats.commands[commandName] || 0) + 1;

    managementStats.recentCommands.unshift({
        command: commandName,
        userId: user?.id || "Unknown",
        username: user?.username || "Unknown",
        timestamp: Date.now()
    });

    managementStats.recentCommands =
        managementStats.recentCommands.slice(
            0,
            8
        );

    addManagementActivity(
        `/${commandName} used by @${user?.username || "Unknown"}`
    );
}

function trackError(type, error) {
    managementStats.errors++;

    if (type === "command") {
        managementStats.failedCommands++;
    }

    if (type === "interaction") {
        managementStats.failedInteractions++;
    }

    console.error(
        `[MANAGEMENT ERROR - ${type}]`,
        error
    );

    addManagementActivity(
        `⚠️ ${type} error detected`
    );

    saveManagementStats();
}

// ======================================================
// MANAGEMENT DASHBOARD STORAGE
// ======================================================

function loadManagementDashboard() {
    try {
        if (!fs.existsSync(MANAGEMENT_DATA_FILE)) {
            return null;
        }

        return JSON.parse(
            fs.readFileSync(
                MANAGEMENT_DATA_FILE,
                "utf8"
            )
        );
    } catch {
        return null;
    }
}

function saveManagementDashboard(data) {
    try {
        fs.writeFileSync(
            MANAGEMENT_DATA_FILE,
            JSON.stringify(
                data,
                null,
                4
            )
        );
    } catch (error) {
        console.error(
            "[MANAGEMENT] Failed saving dashboard:",
            error
        );
    }
}

let managementDashboard =
    loadManagementDashboard();

let managementDashboardMessage = null;

let dashboardUpdating = false;

// ======================================================
// MANAGEMENT PERMISSIONS
// ======================================================

function canUseManagement(member) {
    if (!member) return false;

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    if (
        MANAGEMENT_ROLE_ID &&
        member.roles.cache.has(
            MANAGEMENT_ROLE_ID
        )
    ) {
        return true;
    }

    return false;
}

// ======================================================
// MANAGEMENT DASHBOARD COMPONENTS
// ======================================================

function formatUptime() {
    const uptime =
        client.uptime || 0;

    const seconds =
        Math.floor(uptime / 1000);

    const days =
        Math.floor(seconds / 86400);

    const hours =
        Math.floor(
            (seconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function formatRelative(timestamp) {
    if (!timestamp) {
        return "Never";
    }

    return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

function getMostUsedCommand() {
    const entries =
        Object.entries(
            managementStats.commands
        );

    if (!entries.length) {
        return "None";
    }

    entries.sort(
        (a, b) => b[1] - a[1]
    );

    return `/${entries[0][0]} (${entries[0][1]} uses)`;
}

function getAverageRating() {
    const ratings =
        managementStats.feedback.ratings;

    if (!ratings.length) {
        return "0/10";
    }

    const total =
        ratings.reduce(
            (sum, rating) =>
                sum + Number(rating),
            0
        );

    return `${(
        total / ratings.length
    ).toFixed(1)}/10`;
}

function getTodayFeedbackCount() {
    const now = new Date();

    return managementStats.feedback.ratings.filter(
        item => {
            if (
                typeof item === "number"
            ) {
                return false;
            }

            return false;
        }
    ).length;
}

function getRecentCommandsText() {
    if (
        !managementStats.recentCommands.length
    ) {
        return "No commands recorded yet.";
    }

    return managementStats.recentCommands
        .slice(0, 6)
        .map(item =>
            `/${item.command} — @${item.username} — ${formatRelative(item.timestamp)}`
        )
        .join("\n");
}

function getRecentActivityText() {
    if (
        !managementStats.recentActivity.length
    ) {
        return "No recent activity.";
    }

    return managementStats.recentActivity
        .slice(0, 8)
        .map(item =>
            `> ${item.text} — ${formatRelative(item.timestamp)}`
        )
        .join("\n");
}

function buildManagementComponents() {
    const guild =
        client.guilds.cache.first();

    if (!guild) {
        return [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content:
                            "# Bot Management\n\n> 🟡 The bot is online, but no guild is currently available."
                    }
                ]
            }
        ];
    }

    const memberCount =
        guild.memberCount || 0;

    const onlineCount =
        guild.members.cache.filter(
            member =>
                member.presence &&
                member.presence.status !==
                    "offline"
        ).size;

    const botCount =
        guild.members.cache.filter(
            member => member.user.bot
        ).size;

    const channelCount =
        guild.channels.cache.size;

    const roleCount =
        guild.roles.cache.size;

    const boostLevel =
        guild.premiumTier || 0;

    const latency =
        client.ws.ping >= 0
            ? `${client.ws.ping}ms`
            : "Unknown";

    const commandStats =
        Object.entries(
            managementStats.commands
        )
            .sort(
                (a, b) => b[1] - a[1]
            )
            .slice(0, 6)
            .map(
                ([name, count]) =>
                    `> \`/${name}\` — **${count}** use${count === 1 ? "" : "s"}`
            )
            .join("\n") ||
        "> No commands recorded.";

    const latestError =
        managementStats.errors > 0
            ? "Errors have been recorded. Check the bot console."
            : "No errors have been recorded.";

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
>
> **Panel Status:** 🟢 Live
> **Last Update:** ${formatRelative(Date.now())}`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 🟢 Bot Status

> **Status:** Online
> **Bot:** ${client.user.username}
> **Bot ID:** \`${client.user.id}\`
> **Uptime:** \`${formatUptime()}\`
> **Latency:** \`${latency}\`
> **Last Restart:** ${formatRelative(managementStats.lastRestart)}`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 👥 Server Overview

> **Server:** ${guild.name}
> **Members:** \`${memberCount}\`
> **Online:** \`${onlineCount}\`
> **Bots:** \`${botCount}\`
> **Channels:** \`${channelCount}\`
> **Roles:** \`${roleCount}\`
> **Boost Level:** \`${boostLevel}\`
> **Server ID:** \`${guild.id}\``
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 📊 Command Statistics

> **Total Commands Used:** \`${managementStats.totalCommands}\`
> **Most Used Command:** \`${getMostUsedCommand()}\`

**Command Usage**

${commandStats}

**Recent Commands**

${getRecentCommandsText()}`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 🎫 Ticket Statistics

> **Total Tickets:** \`${managementStats.tickets.total}\`
> **Opened:** \`${managementStats.tickets.opened}\`
> **Claimed:** \`${managementStats.tickets.claimed}\`
> **Closed:** \`${managementStats.tickets.closed}\`

Ticket activity is tracked automatically whenever users open, claim or close tickets.`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 📋 Application Statistics

> **Applications Submitted:** \`${managementStats.applications.submitted}\`
> **Approved:** \`${managementStats.applications.approved}\`
> **Denied:** \`${managementStats.applications.denied}\`
> **Pending:** \`${Math.max(
    0,
    managementStats.applications.submitted -
    managementStats.applications.approved -
    managementStats.applications.denied
)}\`

Application activity is tracked automatically.`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 📝 Staff Feedback

> **Total Feedback:** \`${managementStats.feedback.total}\`
> **Average Rating:** \`${getAverageRating()}\`
> **Feedback Today:** \`${managementStats.feedback.today}\`

Ratings and submissions are tracked automatically from \`/staffeedback\`.`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### ⚡ Recent Activity

${getRecentActivityText()}`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### ⚠️ System & Errors

> **Errors:** \`${managementStats.errors}\`
> **Failed Commands:** \`${managementStats.failedCommands}\`
> **Failed Interactions:** \`${managementStats.failedInteractions}\`

> **Latest Status:** ${latestError}`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 🔧 System Information

> **Discord.js:** \`v14\`
> **Node.js:** \`${process.version}\`
> **Connected Guilds:** \`${client.guilds.cache.size}\`
> **Memory Usage:** \`${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\`
> **CPU Usage:** \`${process.cpuUsage().user / 1000000}ms\`
>
> **Database:** Local JSON storage
> **Command Handler:** Operational
> **Dashboard:** Live`
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,

                    content:
`### 🔐 Access

> This management panel is restricted to authorised staff.
>
> **Last Panel Update:** ${formatRelative(Date.now())}
>
> All statistics and activity shown above are automatically updated by the bot.`
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
// LIVE DASHBOARD UPDATE
// ======================================================

async function updateManagementDashboard() {
    if (
        dashboardUpdating ||
        !managementDashboard?.channelId ||
        !managementDashboard?.messageId
    ) {
        return;
    }

    dashboardUpdating = true;

    try {
        const channel =
            await client.channels.fetch(
                managementDashboard.channelId
            ).catch(() => null);

        if (!channel) {
            dashboardUpdating = false;
            return;
        }

        const message =
            await channel.messages.fetch(
                managementDashboard.messageId
            ).catch(() => null);

        if (!message) {
            dashboardUpdating = false;
            return;
        }

        managementDashboardMessage =
            message;

        await message.edit({
            flags: MessageFlags.IsComponentsV2,

            components:
                buildManagementComponents()
        });
    } catch (error) {
        console.error(
            "[MANAGEMENT] Dashboard update failed:",
            error
        );
    }

    dashboardUpdating = false;
}

// ======================================================
// CREATE MANAGEMENT PANEL
// ======================================================

async function createManagementPanel(
    interaction
) {
    if (
        !canUseManagement(
            interaction.member
        )
    ) {
        return interaction.reply({
            content:
                "You don't have permission to use the Bot Management panel.",
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    try {
        const message =
            await interaction.channel.send({
                flags:
                    MessageFlags.IsComponentsV2,

                components:
                    buildManagementComponents()
            });

        managementDashboard = {
            channelId:
                interaction.channel.id,

            messageId:
                message.id
        };

        managementDashboardMessage =
            message;

        saveManagementDashboard(
            managementDashboard
        );

        await interaction.editReply({
            content:
                "The **Bot Management** panel has been created and is now live. It will automatically update every **10 seconds**."
        });

        addManagementActivity(
            `🟢 Management panel created by @${interaction.user.username}`
        );

        await updateManagementDashboard();
    } catch (error) {
        console.error(
            "[MANAGEMENT] Failed creating panel:",
            error
        );

        await interaction.editReply({
            content:
                "I couldn't create the management panel. Check the bot console for the error."
        });
    }
}

// ======================================================
// MANAGEMENT COMMAND
// ======================================================

const managementCommand =
    new SlashCommandBuilder()
        .setName("management")
        .setDescription(
            "Create the live Bot Management panel."
        );

client.commands.set(
    "management",
    {
        data: managementCommand,

        async execute(interaction) {
            await createManagementPanel(
                interaction
            );
        }
    }
);

// ======================================================
// STAFF FEEDBACK COMMAND
// ======================================================

const staffFeedbackCommand =
    new SlashCommandBuilder()
        .setName("staffeedback")
        .setDescription(
            "Submit feedback about a member of the Staff Team."
        );

client.commands.set(
    "staffeedback",
    {
        data: staffFeedbackCommand,

        async execute(interaction) {
            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "staff_feedback_modal"
                    )
                    .setTitle(
                        "Staff Feedback"
                    );

            const staffUserInput =
                new TextInputBuilder()
                    .setCustomId(
                        "staff_user"
                    )
                    .setLabel(
                        "Staff User"
                    )
                    .setPlaceholder(
                        "Enter the staff member's username or mention"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true)
                    .setMaxLength(100);

            const ratingInput =
                new TextInputBuilder()
                    .setCustomId(
                        "staff_rating"
                    )
                    .setLabel(
                        "Rating"
                    )
                    .setPlaceholder(
                        "Enter a number from 1 to 10"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true)
                    .setMaxLength(2);

            const reasonInput =
                new TextInputBuilder()
                    .setCustomId(
                        "staff_reason"
                    )
                    .setLabel(
                        "Reason"
                    )
                    .setPlaceholder(
                        "Explain your feedback..."
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(1500);

            const anonymousInput =
                new TextInputBuilder()
                    .setCustomId(
                        "staff_anonymous"
                    )
                    .setLabel(
                        "Anonymous?"
                    )
                    .setPlaceholder(
                        "Type Yes or No"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true)
                    .setMaxLength(3);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        staffUserInput
                    ),

                new ActionRowBuilder()
                    .addComponents(
                        ratingInput
                    ),

                new ActionRowBuilder()
                    .addComponents(
                        reasonInput
                    ),

                new ActionRowBuilder()
                    .addComponents(
                        anonymousInput
                    )
            );

            await interaction.showModal(
                modal
            );
        }
    }
);

// ======================================================
// TICKET COUNTER
// ======================================================

function getTicketCounter() {
    try {
        if (
            !fs.existsSync(
                TICKET_COUNTER_FILE
            )
        ) {
            fs.writeFileSync(
                TICKET_COUNTER_FILE,
                JSON.stringify(
                    { next: 1 },
                    null,
                    4
                )
            );
        }

        const data =
            JSON.parse(
                fs.readFileSync(
                    TICKET_COUNTER_FILE,
                    "utf8"
                )
            );

        return (
            Number(data.next) || 1
        );
    } catch {
        return 1;
    }
}

function saveNextTicketCounter(
    next
) {
    try {
        fs.writeFileSync(
            TICKET_COUNTER_FILE,
            JSON.stringify(
                { next },
                null,
                4
            )
        );
    } catch (error) {
        console.error(
            "[TICKET COUNTER ERROR]",
            error
        );
    }
}

function getNextTicketNumber() {
    const number =
        getTicketCounter();

    saveNextTicketCounter(
        number + 1
    );

    return number;
}

// ======================================================
// HELPERS
// ======================================================

function cleanMentions(text) {
    return String(text)
        .replace(
            /@everyone/gi,
            "@ everyone"
        )
        .replace(
            /@here/gi,
            "@ here"
        );
}

function cleanUsername(username) {
    return username
        .toLowerCase()
        .replace(
            /[^a-z0-9-]/g,
            ""
        )
        .slice(0, 70);
}

function hasApplicationReviewPermission(
    member
) {
    if (!member) return false;

    return (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        ) ||
        member.roles.cache.has(
            APPLICATION_REVIEW_ROLE_ID
        )
    );
}

// ======================================================
// STAFF FEEDBACK
// ======================================================

async function submitStaffFeedback(
    interaction
) {
    const staffUser =
        interaction.fields
            .getTextInputValue(
                "staff_user"
            )
            .trim();

    const rating =
        interaction.fields
            .getTextInputValue(
                "staff_rating"
            )
            .trim();

    const reason =
        interaction.fields
            .getTextInputValue(
                "staff_reason"
            )
            .trim();

    const anonymous =
        interaction.fields
            .getTextInputValue(
                "staff_anonymous"
            )
            .trim()
            .toLowerCase();

    const ratingNumber =
        Number(rating);

    if (
        !Number.isInteger(
            ratingNumber
        ) ||
        ratingNumber < 1 ||
        ratingNumber > 10
    ) {
        return interaction.reply({
            content:
                "Your rating must be a whole number between **1 and 10**.",
            flags:
                MessageFlags.Ephemeral
        });
    }

    if (
        anonymous !== "yes" &&
        anonymous !== "no" &&
        anonymous !== "y" &&
        anonymous !== "n"
    ) {
        return interaction.reply({
            content:
                "For **Anonymous?**, please enter either **Yes** or **No**.",
            flags:
                MessageFlags.Ephemeral
        });
    }

    const isAnonymous =
        anonymous === "yes" ||
        anonymous === "y";

    const feedbackChannel =
        await client.channels.fetch(
            STAFF_FEEDBACK_CHANNEL_ID
        ).catch(() => null);

    if (!feedbackChannel) {
        return interaction.reply({
            content:
                "The staff feedback channel could not be found. Please contact an administrator.",
            flags:
                MessageFlags.Ephemeral
        });
    }

    const submittedBy =
        isAnonymous
            ? "Anonymous"
            : `<@${interaction.user.id}>`;

    await feedbackChannel.send({
        flags:
            MessageFlags.IsComponentsV2,

        components: [
            {
                type: 17,

                components: [
                    {
                        type: 12,

                        items: [
                            {
                                media: {
                                    url:
                                        "https://discord-webhook.com/uploads/bf53142f3d520ce34ead4d448974a525.png"
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
`# Staff Feedback

Your feedback helps us maintain a professional and welcoming Staff Team across **Los Angeles State Roleplay**.

> **Staff User:** ${cleanMentions(staffUser)}
> **Feedback From:** ${submittedBy}
> **Rating:** ${ratingNumber}/10
> **Reason:** ${cleanMentions(reason).replace(/\n/g, "\n> ")}

Thank you for taking the time to provide feedback and help us improve our Staff Team.`
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
        ]
    });

    managementStats.feedback.total++;

    managementStats.feedback.ratings.push(
        ratingNumber
    );

    if (
        managementStats.feedback.ratings.length >
        1000
    ) {
        managementStats.feedback.ratings =
            managementStats.feedback.ratings.slice(
                -1000
            );
    }

    managementStats.feedback.today++;

    saveManagementStats();

    addManagementActivity(
        `/staffeedback submitted by @${interaction.user.username}`
    );

    await interaction.reply({
        content:
            "Your staff feedback has been submitted successfully. Thank you for helping us improve the Staff Team.",
        flags:
            MessageFlags.Ephemeral
    });
}

// ======================================================
// TICKET HELPERS
// ======================================================

function getTicketTypeFromChannel(
    channel
) {
    if (
        channel.parentId ===
        GENERAL_CATEGORY_ID
    ) {
        return "General Support";
    }

    if (
        channel.parentId ===
        HIGH_RANK_CATEGORY_ID
    ) {
        return "High Rank Support";
    }

    if (
        channel.parentId ===
        DEPARTMENT_CATEGORY_ID
    ) {
        return "Department Support";
    }

    return "Unknown";
}

function getClaimedUserId(
    channel
) {
    const match =
        channel.topic?.match(
            /ticket-claimed:(\d+)/
        );

    return match
        ? match[1]
        : null;
}

async function getTicketReason(
    channel
) {
    try {
        const messages =
            await channel.messages.fetch({
                limit: 100
            });

        const botMessages =
            messages.filter(
                message =>
                    message.author.id ===
                    client.user.id
            );

        for (
            const message of
            botMessages.values()
        ) {
            if (!message.components)
                continue;

            for (
                const container of
                message.components
            ) {
                if (
                    container.type !==
                        17 ||
                    !container.components
                ) {
                    continue;
                }

                for (
                    const component of
                    container.components
                ) {
                    if (
                        component.type ===
                            10 &&
                        typeof component.content ===
                            "string" &&
                        component.content.includes(
                            "## **Reason**"
                        )
                    ) {
                        const split =
                            component.content.split(
                                "## **Reason**"
                            );

                        if (!split[1])
                            continue;

                        return split[1]
                            .replace(
                                /^```/g,
                                ""
                            )
                            .replace(
                                /```$/g,
                                ""
                            )
                            .replace(
                                /^>\s?/gm,
                                ""
                            )
                            .trim();
                    }
                }
            }
        }
    } catch (error) {
        console.error(
            "[REASON ERROR]",
            error
        );
    }

    return "Not provided";
}

// ======================================================
// TRANSCRIPT HOSTING
// ======================================================

async function uploadTranscriptOnline(
    ticketNumber,
    html
) {
    if (!MSK_API_KEY) {
        console.error(
            "[TRANSCRIPT] MSK_API_KEY is missing."
        );

        return null;
    }

    try {
        const response =
            await fetch(
                `${MSK_API_URL}/api/transcript/upload`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${MSK_API_KEY}`
                    },

                    body:
                        JSON.stringify({
                            ticketId:
                                ticketNumber,

                            transcriptHtml:
                                html,

                            attachments: []
                        })
                }
            );

        let data;

        try {
            data =
                await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            console.error(
                "[TRANSCRIPT UPLOAD ERROR]",
                response.status,
                data
            );

            return null;
        }

        return (
            data.url || null
        );
    } catch (error) {
        console.error(
            "[TRANSCRIPT NETWORK ERROR]",
            error
        );

        return null;
    }
}

// ======================================================
// CREATE TICKET LOG
// ======================================================

async function createTicketLog({
    ticketNumber,
    openedBy,
    ticketType,
    reason,
    claimedBy,
    closedBy,
    transcriptUrl
}) {
    try {
        const logChannel =
            await client.channels.fetch(
                TICKET_LOG_CHANNEL_ID
            );

        if (!logChannel) {
            console.error(
                "[TICKET LOG] Channel not found."
            );

            return;
        }

        const claimedText =
            claimedBy
                ? `<@${claimedBy}>`
                : "Unclaimed";

        const transcriptText =
            transcriptUrl
                ? `[View Transcript](${transcriptUrl})`
                : "Transcript unavailable";

        await logChannel.send({
            flags:
                MessageFlags.IsComponentsV2,

            components: [
                {
                    type: 17,

                    components: [
                        {
                            type: 12,

                            items: [
                                {
                                    media: {
                                        url:
                                            "https://discord-webhook.com/uploads/bebfa3fc5a4226a9a3ebf746a42da75b.png"
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
`### Ticket Logged ${ticketNumber}

> **Opened By:** <@${openedBy}>
> **Ticket Type:** ${ticketType}
> **Reason:** ${cleanMentions(reason)}
> **Claimed By:** ${claimedText}
> **Closed By:** <@${closedBy}>
> **Transcript:** ${transcriptText}`
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
            ]
        });

        console.log(
            `[TICKET LOG] Ticket Logged ${ticketNumber}`
        );
    } catch (error) {
        console.error(
            "[TICKET LOG ERROR]",
            error
        );
    }
}

// ======================================================
// APPLICATION QUESTIONS
// ======================================================

const APPLICATION_QUESTIONS = [
    {
        id: "q1",
        title: "Roblox Username",
        question:
            "What is your Roblox username?"
    },

    {
        id: "q2",
        title: "Roblox User ID",
        question:
            "What is your Roblox User ID?"
    },

    {
        id: "q3",
        title: "Age",
        question:
            "How old are you?"
    },

    {
        id: "q4",
        title: "Timezone",
        question:
            "What is your timezone?"
    },

    {
        id: "q5",
        title: "Previous Experience",
        question:
            "Do you have any previous staff or moderation experience? If so, explain."
    },

    {
        id: "q6",
        title: "RDM",
        question:
            "What is RDM, and how would you deal with a situation involving RDM?"
    },

    {
        id: "q7",
        title: "VDM",
        question:
            "What is VDM, and how would you deal with a situation involving VDM?"
    },

    {
        id: "q8",
        title: "Staff Abuse",
        question:
            "What would you do if you witnessed another staff member abusing their permissions?"
    },

    {
        id: "q9",
        title: "Disrespect",
        question:
            "How would you handle a player who becomes disrespectful or argumentative while you are moderating them?"
    },

    {
        id: "q10",
        title: "Moderation Scenario",
        question:
            "A player is breaking server rules but claims they did nothing wrong. How would you handle the situation?"
    },

    {
        id: "q11",
        title: "Teamwork",
        question:
            "Why is teamwork important within a staff team?"
    },

    {
        id: "q12",
        title: "Why You?",
        question:
            "Why should we choose you for the staff team?"
    }
];

// ======================================================
// SEND APPLICATION QUESTION
// ======================================================

async function sendApplicationQuestion(
    channel,
    application
) {
    const question =
        APPLICATION_QUESTIONS[
            application.questionIndex
        ];

    if (!question) {
        await finishApplication(
            channel,
            application
        );

        return;
    }

    const number =
        application.questionIndex + 1;

    await channel.send({
        flags:
            MessageFlags.IsComponentsV2,

        components: [
            {
                type: 17,

                components: [
                    {
                        type: 10,

                        content:
`# Question ${number}/12

### ${question.title}

> ${question.question}

Please send your answer below.`
                    },

                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    {
                        type: 10,

                        content:
`**Application Progress**

\`${number - 1}/12\` questions completed`
                    }
                ]
            }
        ]
    });
}

// ======================================================
// CREATE APPLICATION
// ======================================================

async function createStaffApplication(
    interaction
) {
    const existing =
        interaction.guild.channels.cache.find(
            channel =>
                channel.type ===
                    ChannelType.GuildText &&
                channel.topic?.includes(
                    `staff-application:${interaction.user.id}`
                )
        );

    if (existing) {
        return interaction.reply({
            content:
                `You already have an open application: ${existing}`,
            flags:
                MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply({
        flags:
            MessageFlags.Ephemeral
    });

    // A new application means any earlier review of this
    // person no longer blocks reviewing the new one
    reviewedApplications.delete(
        interaction.user.id
    );

    // Make sure the application images are loaded
    await loadApplicationImages();

    const username =
        cleanUsername(
            interaction.user.username
        );

    const applicationChannel =
        await interaction.guild.channels.create(
            {
                name:
                    `application-${username}`
                        .slice(0, 100),

                type:
                    ChannelType.GuildText,

                parent:
                    APPLICATION_CATEGORY_ID,

                topic:
                    `staff-application:${interaction.user.id}`,

                permissionOverwrites: [
                    {
                        id:
                            interaction.guild.roles.everyone.id,

                        deny: [
                            PermissionFlagsBits.ViewChannel
                        ]
                    },

                    {
                        id:
                            interaction.user.id,

                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ]
                    },

                    {
                        id:
                            interaction.client.user.id,

                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ]
            }
        );

    const application = {
        userId:
            interaction.user.id,

        channelId:
            applicationChannel.id,

        questionIndex:
            0,

        answers: {},

        completed:
            false,

        reviewed:
            false,

        startedAt:
            Date.now()
    };

    applications.set(
        applicationChannel.id,
        application
    );

    managementStats.applications.submitted++;

    saveManagementStats();

    addManagementActivity(
        `📋 Application submitted by @${interaction.user.username}`
    );

    await sendApplicationPanel(
        applicationChannel,
        ["top", "bottom"],
        useAttachments => [
            {
                type: 17,

                components: [
                    {
                        type: 12,

                        items: [
                            {
                                media: {
                                    url:
                                        applicationImageUrl(
                                            "top",
                                            useAttachments
                                        )
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
`**<@${interaction.user.id}>**

You will have exactly \`30 minutes\` from now to finish this application, or your application will be cancelled and this channel will be deleted!

Make sure to review your answers, use grammar at all times, and don't delete any of your answers once sent.

**Good Luck!**

**Application Closes:** in 30 minutes`
                    },

                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    {
                        type: 1,

                        components: [
                            {
                                type: 2,
                                style: 4,
                                label:
                                    "Cancel Application",

                                custom_id:
                                    "staff_application_cancel"
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
                                    url:
                                        applicationImageUrl(
                                            "bottom",
                                            useAttachments
                                        )
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    ).catch(error => {
        console.error(
            "[APPLICATION PANEL] Could not send the application panel:",
            error
        );
    });

    await sendApplicationQuestion(
        applicationChannel,
        application
    );

    await interaction.editReply({
        content:
            `Your staff application has been created: ${applicationChannel}`
    });

    setTimeout(
        async () => {
            const current =
                applications.get(
                    applicationChannel.id
                );

            if (!current)
                return;

            if (
                current.completed ||
                current.reviewed
            ) {
                return;
            }

            const user =
                await client.users.fetch(
                    current.userId
                ).catch(() => null);

            if (user) {
                await user.send(
                    "Your staff application was automatically cancelled because the 30-minute time limit expired."
                ).catch(() => {});
            }

            await applicationChannel.delete(
                "Staff application expired after 30 minutes"
            ).catch(() => {});

            applications.delete(
                applicationChannel.id
            );
        },
        APPLICATION_TIMEOUT
    );
}

// ======================================================
// FINISH APPLICATION
// ======================================================

async function finishApplication(
    channel,
    application
) {
    if (application.completed)
        return;

    application.completed =
        true;

    applications.set(
        channel.id,
        application
    );

    // Make sure the application images are loaded
    await loadApplicationImages();

    const user =
        await client.users.fetch(
            application.userId
        ).catch(() => null);

    const answers =
        APPLICATION_QUESTIONS
            .map(
                (question, index) => {
                    const answer =
                        application.answers[
                            question.id
                        ] ||
                        "No answer provided.";

                    return (
                        `### ${index + 1}. ${question.title}\n` +
                        `> ${cleanMentions(answer)}`
                    );
                }
            )
            .join("\n\n");

    const buildReviewPanel =
        useAttachments => [
            {
                type: 17,

                components: [
                    {
                        type: 12,

                        items: [
                            {
                                media: {
                                    url:
                                        applicationImageUrl(
                                            "top",
                                            useAttachments
                                        )
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
`# Staff Application

**Applicant:** <@${application.userId}>
**Username:** \`${user?.username || "Unknown"}\`

Please review the applicant's answers below.`
                    },

                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    {
                        type: 10,
                        content:
                            answers
                    },

                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    {
                        type: 1,

                        components: [
                            {
                                type: 2,
                                style: 3,
                                label:
                                    "Approve",

                                custom_id:
                                    `staff_application_approve:${application.userId}`
                            },

                            {
                                type: 2,
                                style: 4,
                                label:
                                    "Deny",

                                custom_id:
                                    `staff_application_deny:${application.userId}`
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
                                    url:
                                        applicationImageUrl(
                                            "bottom",
                                            useAttachments
                                        )
                                }
                            }
                        ]
                    }
                ]
            }
        ];

    const reviewChannel =
        await client.channels.fetch(
            APPLICATION_REVIEW_CHANNEL_ID
        ).catch(() => null);

    if (reviewChannel) {
        await sendApplicationPanel(
            reviewChannel,
            ["top", "bottom"],
            buildReviewPanel
        ).catch(error => {
            console.error(
                "[APPLICATION REVIEW] Could not post the review panel:",
                error
            );
        });
    } else {
        console.error(
            `[APPLICATION REVIEW] Review channel ${APPLICATION_REVIEW_CHANNEL_ID} was not found or the bot cannot see it.`
        );
    }

    const completedChannel =
        await client.channels.fetch(
            COMPLETED_APPLICATION_CHANNEL_ID
        ).catch(() => null);

    if (
        completedChannel &&
        COMPLETED_APPLICATION_CHANNEL_ID !==
            APPLICATION_REVIEW_CHANNEL_ID
    ) {
        await sendApplicationPanel(
            completedChannel,
            ["top", "bottom"],
            buildReviewPanel
        ).catch(error => {
            console.error(
                "[APPLICATION REVIEW] Could not post to the completed applications channel:",
                error
            );
        });
    } else if (
        !completedChannel &&
        COMPLETED_APPLICATION_CHANNEL_ID !==
            APPLICATION_REVIEW_CHANNEL_ID
    ) {
        console.error(
            `[APPLICATION REVIEW] Completed channel ${COMPLETED_APPLICATION_CHANNEL_ID} was not found or the bot cannot see it.`
        );
    }

    setTimeout(
        async () => {
            await channel.delete(
                "Staff application completed"
            ).catch(() => {});

            applications.delete(
                channel.id
            );
        },
        3000
    );
}

// ======================================================
// REVIEWED COMPONENTS
// ======================================================
//
// discord.js gives us component CLASS INSTANCES on
// interaction.message.components. Spreading those instances
// loses fields like "type" and "custom_id", which made the
// edit fail. Everything is converted to plain API objects
// with .toJSON() first, then rebuilt.
//
// Images that were uploaded as attachments are re-pointed
// to attachment://filename so they keep displaying.
//
// ======================================================

function cleanRawComponent(component) {
    const raw = { ...component };

    // IDs are re-assigned by Discord automatically
    delete raw.id;

    if (Array.isArray(raw.components)) {
        raw.components =
            raw.components.map(cleanRawComponent);
    }

    // Media gallery: keep images displaying
    if (
        raw.type === 12 &&
        Array.isArray(raw.items)
    ) {
        raw.items = raw.items.map(item => {
            const originalUrl =
                item.media?.url || "";

            let finalUrl =
                originalUrl;

            if (
                /discordapp\.(com|net)\/attachments\//i.test(
                    originalUrl
                )
            ) {
                try {
                    const fileName =
                        decodeURIComponent(
                            new URL(originalUrl)
                                .pathname
                                .split("/")
                                .pop()
                        );

                    finalUrl =
                        `attachment://${fileName}`;
                } catch {
                    finalUrl =
                        originalUrl;
                }
            }

            return {
                media: {
                    url: finalUrl
                },

                description:
                    item.description || undefined,

                spoiler:
                    item.spoiler || false
            };
        });
    }

    return raw;
}

function buildReviewedComponents(
    originalComponents,
    decision,
    reviewer
) {
    return originalComponents.map(
        original => {
            const rawContainer =
                typeof original.toJSON === "function"
                    ? original.toJSON()
                    : original;

            const container =
                cleanRawComponent(rawContainer);

            if (
                container.type !== 17 ||
                !Array.isArray(container.components)
            ) {
                return container;
            }

            return {
                ...container,

                components:
                    container.components.map(
                        component => {
                            if (
                                component.type === 1 &&
                                Array.isArray(component.components)
                            ) {
                                const hasReviewButtons =
                                    component.components.some(
                                        button =>
                                            button.type === 2 &&
                                            (
                                                button.custom_id?.startsWith(
                                                    "staff_application_approve:"
                                                ) ||
                                                button.custom_id?.startsWith(
                                                    "staff_application_deny:"
                                                )
                                            )
                                    );

                                if (!hasReviewButtons) {
                                    return component;
                                }

                                return {
                                    ...component,

                                    components: [
                                        {
                                            type: 2,

                                            style:
                                                decision ===
                                                "approved"
                                                    ? 3
                                                    : 4,

                                            label:
                                                decision ===
                                                "approved"
                                                    ? `Approved by ${reviewer.username}`
                                                    : `Denied by ${reviewer.username}`,

                                            custom_id:
                                                `staff_application_reviewed:${decision}`,

                                            disabled:
                                                true
                                        }
                                    ]
                                };
                            }

                            if (
                                component.type === 10 &&
                                typeof component.content ===
                                    "string" &&
                                component.content.startsWith(
                                    "# Staff Application"
                                )
                            ) {
                                return {
                                    ...component,

                                    content:
`${component.content}

**Decision:** ${
    decision === "approved"
        ? "Approved"
        : "Denied"
}

**Reviewed by:** ${reviewer}`
                                };
                            }

                            return component;
                        }
                    )
            };
        }
    );
}

// ======================================================
// POST APPROVAL RESULTS
// ======================================================
//
// Posts the "Results" message in the results channel.
// Returns { ok, reason } so the reviewer can be told in
// Discord exactly what happened (no console needed).
//
// 1. Checks the bot can see/send in the results channel
// 2. Tries the full panel with uploaded images
// 3. Falls back to plain image links
// 4. Falls back to a plain text message
//
// ======================================================

async function postApprovalResults(
    interaction,
    applicantId
) {
    await loadApplicationImages();

    let channel = null;

    try {
        channel =
            await client.channels.fetch(
                RESULTS_CHANNEL_ID
            );
    } catch (error) {
        console.error(
            "[RESULTS] Could not fetch the results channel:",
            error
        );

        return {
            ok: false,
            reason:
                `I can't access the results channel <#${RESULTS_CHANNEL_ID}> (${error.message}). Give the bot **View Channel**, **Send Messages** and **Attach Files** there.`
        };
    }

    if (
        !channel ||
        typeof channel.send !== "function"
    ) {
        console.error(
            `[RESULTS] Channel ${RESULTS_CHANNEL_ID} is not a channel the bot can send messages in.`
        );

        return {
            ok: false,
            reason:
                `<#${RESULTS_CHANNEL_ID}> is not a channel I can send messages in. Check that the results channel ID is correct and is a normal text channel.`
        };
    }

    // Permission check, so the reviewer gets a clear message

    try {
        const me =
            channel.guild?.members.me ||
            await channel.guild?.members
                .fetchMe()
                .catch(() => null);

        const permissions =
            me
                ? channel.permissionsFor(me)
                : null;

        if (permissions) {
            const missing =
                permissions.missing([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages
                ]);

            if (missing.length) {
                console.error(
                    `[RESULTS] Bot is missing permissions in ${RESULTS_CHANNEL_ID}:`,
                    missing
                );

                return {
                    ok: false,
                    reason:
                        `I'm missing **${missing.join(", ")}** in <#${RESULTS_CHANNEL_ID}>. Give the bot those permissions (and **Attach Files**) in that channel.`
                };
            }
        }
    } catch (error) {
        console.error(
            "[RESULTS] Permission check failed:",
            error
        );
    }

    // Full panel (uploaded images, then image links)

    try {
        await sendApplicationPanel(
            channel,
            ["results", "bottom"],
            useAttachments => [
                {
                    type: 17,

                    components: [
                        {
                            type: 12,

                            items: [
                                {
                                    media: {
                                        url:
                                            applicationImageUrl(
                                                "results",
                                                useAttachments
                                            )
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
`# Results

> We would like to congratulate you on passing your application and becoming a **Trainee** within our server. Your dedication throughout your application has stood out to us and has earned you a place in our community.`
                        },

                        {
                            type: 14,
                            spacing: 1,
                            divider: true
                        },

                        {
                            type: 10,

                            content:
`# Training

> Please be on the lookout in our **Training** category for updates and training sessions from our Training Team.`
                        },

                        {
                            type: 14,
                            spacing: 1,
                            divider: true
                        },

                        {
                            type: 10,

                            content:
`# Welcome

> Once again, congratulations, **<@${applicantId}>**, and welcome to the team!

**Approved by:** ${interaction.user}`
                        },

                        {
                            type: 12,

                            items: [
                                {
                                    media: {
                                        url:
                                            applicationImageUrl(
                                                "bottom",
                                                useAttachments
                                            )
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        );

        return { ok: true };
    } catch (error) {
        console.error(
            "[RESULTS] Could not post the results panel, trying plain text:",
            error
        );
    }

    // Last resort: plain text so the result is ALWAYS announced

    try {
        await channel.send({
            content:
`# Results

> We would like to congratulate you on passing your application and becoming a **Trainee** within our server. Your dedication throughout your application has stood out to us and has earned you a place in our community.

# Training

> Please be on the lookout in our **Training** category for updates and training sessions from our Training Team.

# Welcome

> Once again, congratulations, **<@${applicantId}>**, and welcome to the team!

**Approved by:** ${interaction.user}`,

            allowedMentions: {
                users: [applicantId]
            }
        });

        return {
            ok: true,
            note:
                "The results were posted as plain text because the fancy panel could not be sent."
        };
    } catch (error) {
        console.error(
            "[RESULTS] Plain text results also failed:",
            error
        );

        return {
            ok: false,
            reason:
                `I couldn't post in <#${RESULTS_CHANNEL_ID}>: ${error.message}`
        };
    }
}

// ======================================================
// APPROVE APPLICATION
// ======================================================

async function approveApplication(
    interaction,
    applicantId
) {
    if (
        !hasApplicationReviewPermission(
            interaction.member
        )
    ) {
        return interaction.reply({
            content:
                "You don't have permission to review staff applications.",
            flags:
                MessageFlags.Ephemeral
        });
    }

    if (
        reviewedApplications.has(
            applicantId
        )
    ) {
        return interaction.reply({
            content:
                "This application has already been reviewed.",
            flags:
                MessageFlags.Ephemeral
        });
    }

    reviewedApplications.add(
        applicantId
    );

    managementStats.applications.approved++;

    saveManagementStats();

    addManagementActivity(
        `📋 Application approved by @${interaction.user.username}`
    );

    // 1. Update the review panel (must happen first)

    await interaction.update({
        flags:
            MessageFlags.IsComponentsV2,

        components:
            buildReviewedComponents(
                interaction.message.components,
                "approved",
                interaction.user
            )
    }).catch(error => {
        console.error(
            "[APPROVE] Could not update the review panel:",
            error
        );
    });

    // 2. Post the results message straight away

    let resultsOutcome;

    try {
        resultsOutcome =
            await postApprovalResults(
                interaction,
                applicantId
            );
    } catch (error) {
        console.error(
            "[RESULTS] Unexpected error:",
            error
        );

        resultsOutcome = {
            ok: false,
            reason:
                `Unexpected error while posting the results: ${error.message}`
        };
    }

    // 3. Give the Trainee role

    try {
        const member =
            await interaction.guild.members.fetch(
                applicantId
            ).catch(() => null);

        if (member) {
            await member.roles.add(
                TRAINEE_ROLE_ID,
                `Staff application approved by ${interaction.user.tag}`
            );
        }
    } catch (error) {
        console.error(
            "[APPROVE] Could not give the Trainee role:",
            error
        );
    }

    // 4. DM the applicant

    try {
        const applicant =
            await client.users.fetch(
                applicantId
            ).catch(() => null);

        if (applicant) {
            await applicant.send({
                content:
`# Staff Application Result

Congratulations! Your staff application for **Los Angeles State Roleplay** has been **approved**.

You have been accepted as a **Trainee** within our server.

Please be on the lookout in the **Training** category for updates and training sessions from our Training Team.

**Approved by:** ${interaction.user}`
            }).catch(() => {});
        }
    } catch (error) {
        console.error(
            "[APPROVE] Could not DM the applicant:",
            error
        );
    }

    // 5. Mark the application as reviewed

    for (
        const application of
        applications.values()
    ) {
        if (
            application.userId ===
            applicantId
        ) {
            application.reviewed =
                true;

            applications.set(
                application.channelId,
                application
            );

            break;
        }
    }

    // 6. Tell the reviewer exactly what happened

    let followUpText =
        `Application **approved** by ${interaction.user}.`;

    if (resultsOutcome?.ok) {
        followUpText +=
            `\n✅ Results posted in <#${RESULTS_CHANNEL_ID}>.`;

        if (resultsOutcome.note) {
            followUpText +=
                `\n${resultsOutcome.note}`;
        }
    } else {
        followUpText +=
            `\n⚠️ **The results message was NOT posted.**\n${resultsOutcome?.reason || "Unknown error. Check the bot console."}`;
    }

    await interaction.followUp({
        content:
            followUpText,
        flags:
            MessageFlags.Ephemeral
    }).catch(() => {});
}

// ======================================================
// DENY APPLICATION
// ======================================================

async function denyApplication(
    interaction,
    applicantId
) {
    if (
        !hasApplicationReviewPermission(
            interaction.member
        )
    ) {
        return interaction.reply({
            content:
                "You don't have permission to review staff applications.",
            flags:
                MessageFlags.Ephemeral
        });
    }

    if (
        reviewedApplications.has(
            applicantId
        )
    ) {
        return interaction.reply({
            content:
                "This application has already been reviewed.",
            flags:
                MessageFlags.Ephemeral
        });
    }

    reviewedApplications.add(
        applicantId
    );

    managementStats.applications.denied++;

    saveManagementStats();

    addManagementActivity(
        `📋 Application denied by @${interaction.user.username}`
    );

    await interaction.update({
        flags:
            MessageFlags.IsComponentsV2,

        components:
            buildReviewedComponents(
                interaction.message.components,
                "denied",
                interaction.user
            )
    }).catch(error => {
        console.error(
            "[DENY] Could not update the review panel:",
            error
        );
    });

    const applicant =
        await client.users.fetch(
            applicantId
        ).catch(() => null);

    if (applicant) {
        await applicant.send({
            content:
`# Staff Application Result

Thank you for taking the time to apply for the staff team at **Los Angeles State Roleplay**.

Unfortunately, your staff application has been **denied** at this time.

We encourage you to continue being active in our community and to apply again in the future.

**Reviewed by:** ${interaction.user}`
        }).catch(() => {});
    }

    for (
        const application of
        applications.values()
    ) {
        if (
            application.userId ===
            applicantId
        ) {
            application.reviewed =
                true;

            applications.set(
                application.channelId,
                application
            );

            break;
        }
    }

    await interaction.followUp({
        content:
            `Application **denied** by ${interaction.user}.`,
        flags:
            MessageFlags.Ephemeral
    }).catch(() => {});
}

// ======================================================
// READY
// ======================================================

client.once(
    "clientReady",
    async () => {
        managementStats.lastRestart =
            Date.now();

        saveManagementStats();

        console.log(
            "--------------------------------"
        );

        console.log(
            `Logged in as ${client.user.tag}`
        );

        console.log(
            `Bot ID: ${client.user.id}`
        );

        console.log(
            `Connected Guilds: ${client.guilds.cache.size}`
        );

        // ==================================================
        // LOAD APPLICATION IMAGES
        // ==================================================

        await loadApplicationImages(true);

        // ==================================================
        // REGISTER COMMANDS
        // ==================================================

        try {
            const rest =
                new REST({
                    version: "10"
                }).setToken(
                    process.env.TOKEN
                );

            const commandData =
                client.commands
                    .filter(
                        command =>
                            command.data
                    )
                    .map(
                        command =>
                            command.data.toJSON()
                    );

            if (
                process.env.GUILD_ID
            ) {
                await rest.put(
                    Routes.applicationGuildCommands(
                        client.user.id,
                        process.env.GUILD_ID
                    ),
                    {
                        body:
                            commandData
                    }
                );

                console.log(
                    `[COMMANDS] Registered ${commandData.length} command(s) to guild ${process.env.GUILD_ID}.`
                );
            } else {
                await rest.put(
                    Routes.applicationCommands(
                        client.user.id
                    ),
                    {
                        body:
                            commandData
                    }
                );

                console.log(
                    `[COMMANDS] Registered ${commandData.length} global command(s).`
                );
            }
        } catch (error) {
            trackError(
                "command registration",
                error
            );
        }

        // ==================================================
        // RESTORE MANAGEMENT DASHBOARD
        // ==================================================

        if (
            managementDashboard
        ) {
            console.log(
                `[MANAGEMENT] Restoring live panel ${managementDashboard.messageId}`
            );

            setTimeout(
                updateManagementDashboard,
                3000
            );
        }

        if (MSK_API_KEY) {
            console.log(
                "[TRANSCRIPTS] Online transcript service configured."
            );
        } else {
            console.log(
                "[TRANSCRIPTS] WARNING: MSK_API_KEY is missing."
            );
        }

        console.log(
            "--------------------------------"
        );
    }
);

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
    "interactionCreate",
    async interaction => {
        try {

            // ==================================================
            // SLASH COMMANDS
            // ==================================================

            if (
                interaction.isChatInputCommand()
            ) {
                const command =
                    client.commands.get(
                        interaction.commandName
                    );

                if (!command)
                    return;

                trackCommand(
                    interaction.commandName,
                    interaction.user
                );

                try {
                    await command.execute(
                        interaction
                    );
                } catch (error) {
                    trackError(
                        "command",
                        error
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {
                        await interaction.reply({
                            content:
                                "Something went wrong while running this command.",
                            flags:
                                MessageFlags.Ephemeral
                        }).catch(() => {});
                    }
                }

                return;
            }

            // ==================================================
            // STAFF FEEDBACK MODAL
            // ==================================================

            if (
                interaction.isModalSubmit() &&
                interaction.customId ===
                    "staff_feedback_modal"
            ) {
                await submitStaffFeedback(
                    interaction
                );

                return;
            }

            // ==================================================
            // GUIDELINES
            // ==================================================

            if (
                interaction.isStringSelectMenu() &&
                interaction.customId ===
                    "lasrp_guidelines_select"
            ) {
                const selected =
                    interaction.values[0];

                const guidelines = {
                    roblox_tos: {
                        content:
`# Roblox Terms of Service

> All members are expected to follow Roblox's Terms of Use and Community Standards while participating in Los Angeles State Roleplay.

> Any content or behaviour that violates Roblox's rules may result in moderation action within our community where appropriate.

**Official Roblox Rules:**
https://en.help.roblox.com/hc/en-us/categories/115000249263-Roblox-Rules

Please make sure you are familiar with the current Roblox rules before using our server.`
                    },

                    discord_tos: {
                        content:
`# Discord Terms of Service

> All members are expected to follow Discord's Terms of Service and Community Guidelines while participating in our community.

> Harassment, malicious behaviour, prohibited content, or other violations of Discord's rules are not permitted within our server.

**Discord Terms of Service:**
https://discord.com/terms

**Discord Community Guidelines:**
https://discord.com/guidelines

Please make sure you are familiar with the current Discord rules before using our server.`
                    }
                };

                const guideline =
                    guidelines[selected];

                if (!guideline) {
                    return interaction.reply({
                        content:
                            "Invalid guideline selected.",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                await interaction.reply({
                    content:
                        guideline.content,

                    flags:
                        MessageFlags.Ephemeral
                });

                return;
            }

            // ==================================================
            // HR INFORMATION
            // ==================================================

            if (
                interaction.isButton() &&
                interaction.customId === "hr_information"
            ) {
                await interaction.reply({
                    content:
`# Punishment Appeals

**Punishment Appeal**

**My ROBLOX Username:**
**Punishment Type:**
**Punishment Reason:**
**Why should we accept your appeal?**


# Ingame Ban Appeals

**Ban Appeal**

**My ROBLOX Username:**
**Ban Reason:**
**Why should we accept your appeal?**


# Fast Pass

**Fast-Pass**

**Your ROBLOX User:**
**All your previous experiences, please include membercount and your rank. Server invite CODE, if possible:**
**Why do I want to be staff here?**


# Staff Transfer

**Staff Transfer**

**Your ROBLOX User:**
**All your previous experiences, please include membercount and your rank. Server invite CODE, if possible:**
**Why do I want to be staff here?**


# Staff Report

**Staff Report**

**My ROBLOX Username:**
**Suspect:**
**Context of Scene:**
**Why are you reporting them?**
**Evidence:**`,
                    flags: MessageFlags.Ephemeral
                });

                return;
            }

            // ==================================================
            // ASSISTANCE DROPDOWN
            // ==================================================

            if (
                interaction.isStringSelectMenu() &&
                interaction.customId ===
                    "lasrp_assistance_category"
            ) {
                const categories = {
                    general: {
                        label:
                            "General Support",

                        channelName:
                            "general-support",

                        categoryId:
                            GENERAL_CATEGORY_ID
                    },

                    high_rank: {
                        label:
                            "High Rank Support",

                        channelName:
                            "high-rank-support",

                        categoryId:
                            HIGH_RANK_CATEGORY_ID
                    },

                    department: {
                        label:
                            "Department Support",

                        channelName:
                            "department-support",

                        categoryId:
                            DEPARTMENT_CATEGORY_ID
                    }
                };

                const selected =
                    interaction.values[0];

                const ticketType =
                    categories[selected];

                if (!ticketType) {
                    return interaction.reply({
                        content:
                            "Invalid ticket category.",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                const modal =
                    new ModalBuilder()
                        .setCustomId(
                            `ticket_reason_${selected}`
                        )
                        .setTitle(
                            `${ticketType.label} Reason`
                        );

                const reasonInput =
                    new TextInputBuilder()
                        .setCustomId(
                            "ticket_reason"
                        )
                        .setLabel(
                            "What can we help you with?"
                        )
                        .setStyle(
                            TextInputStyle.Paragraph
                        )
                        .setPlaceholder(
                            "Explain why you are opening this ticket..."
                        )
                        .setRequired(true)
                        .setMinLength(2)
                        .setMaxLength(1000);

                modal.addComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            reasonInput
                        )
                );

                await interaction.showModal(
                    modal
                );

                return;
            }

            // ==================================================
            // STAFF APPLICATION DROPDOWN
            // ==================================================

            if (
                interaction.isStringSelectMenu() &&
                (
                    interaction.customId ===
                        "staff_application_menu" ||
                    interaction.customId ===
                        "staff_application"
                )
            ) {
                if (
                    interaction.values.includes(
                        "staff_application"
                    )
                ) {
                    await createStaffApplication(
                        interaction
                    );
                }

                return;
            }

            // ==================================================
            // CREATE TICKET
            // ==================================================

            if (
                interaction.isModalSubmit() &&
                interaction.customId.startsWith(
                    "ticket_reason_"
                )
            ) {
                const categories = {
                    general: {
                        label:
                            "General Support",

                        channelName:
                            "general-support",

                        categoryId:
                            GENERAL_CATEGORY_ID,

                        staffPings: [
                            "1555593610370748469",
                            "1555283780447641620"
                        ]
                    },

                    high_rank: {
                        label:
                            "High Rank Support",

                        channelName:
                            "high-rank-support",

                        categoryId:
                            HIGH_RANK_CATEGORY_ID,

                        staffPings: [
                            "1555283780447641620"
                        ]
                    },

                    department: {
                        label:
                            "Department Support",

                        channelName:
                            "department-support",

                        categoryId:
                            DEPARTMENT_CATEGORY_ID,

                        staffPings: [
                            "1555279476949258320"
                        ]
                    }
                };

                const selected =
                    interaction.customId.replace(
                        "ticket_reason_",
                        ""
                    );

                const ticketType =
                    categories[selected];

                if (!ticketType) {
                    return interaction.reply({
                        content:
                            "Invalid ticket type.",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                const reason =
                    interaction.fields.getTextInputValue(
                        "ticket_reason"
                    );

                try {
                    const existingTicket =
                        interaction.guild.channels.cache.find(
                            channel =>
                                channel.type ===
                                    ChannelType.GuildText &&
                                channel.topic?.includes(
                                    `ticket-owner:${interaction.user.id}`
                                )
                        );

                    if (
                        existingTicket
                    ) {
                        return interaction.reply({
                            content:
                                `You already have an open ticket: ${existingTicket}`,
                            flags:
                                MessageFlags.Ephemeral
                        });
                    }

                    await interaction.deferReply({
                        flags:
                            MessageFlags.Ephemeral
                    });

                    const username =
                        cleanUsername(
                            interaction.user.username
                        );

                    const ticketChannel =
                        await interaction.guild.channels.create(
                            {
                                name:
                                    `${ticketType.channelName}-${username}`
                                        .slice(
                                            0,
                                            100
                                        ),

                                type:
                                    ChannelType.GuildText,

                                parent:
                                    ticketType.categoryId,

                                topic:
                                    `ticket-owner:${interaction.user.id}`,

                                permissionOverwrites: [
                                    {
                                        id:
                                            interaction.guild.roles.everyone.id,

                                        deny: [
                                            PermissionFlagsBits.ViewChannel
                                        ]
                                    },

                                    {
                                        id:
                                            interaction.user.id,

                                        allow: [
                                            PermissionFlagsBits.ViewChannel,
                                            PermissionFlagsBits.SendMessages,
                                            PermissionFlagsBits.ReadMessageHistory,
                                            PermissionFlagsBits.AttachFiles,
                                            PermissionFlagsBits.EmbedLinks
                                        ]
                                    },

                                    {
                                        id:
                                            interaction.client.user.id,

                                        allow: [
                                            PermissionFlagsBits.ViewChannel,
                                            PermissionFlagsBits.SendMessages,
                                            PermissionFlagsBits.ReadMessageHistory,
                                            PermissionFlagsBits.ManageChannels,
                                            PermissionFlagsBits.ManageMessages
                                        ]
                                    }
                                ]
                            }
                        );

                    managementStats.tickets.total++;
                    managementStats.tickets.opened++;

                    saveManagementStats();

                    addManagementActivity(
                        `🎫 Ticket opened by @${interaction.user.username}`
                    );

                    const bell =
                        "<:944992bell:1555288511622549647>";

                    const info =
                        "<:685951info:1555288511622549647>";

                    const book =
                        "<:401776book:1555288511622549647>";

                    const megaphone =
                        "<:1882megaphone:1555288511622549647>";

                    const star =
                        "<:693596winterstar:1555288511622549647>";

                    const staffMentions =
                        ticketType.staffPings
                            .map(
                                id =>
                                    `<@&${id}>`
                            )
                            .join(" ");

                    await ticketChannel.send({
                        content:
                            `${interaction.user} ${staffMentions}`,

                        allowedMentions: {
                            users: [
                                interaction.user.id
                            ],

                            roles:
                                ticketType.staffPings
                        }
                    });

                    await ticketChannel.send({
                        flags:
                            MessageFlags.IsComponentsV2,

                        components: [
                            {
                                type: 17,

                                components: [
                                    {
                                        type: 12,

                                        items: [
                                            {
                                                media: {
                                                    url:
                                                        "https://discord-webhook.com/uploads/db3500b0b677deb15720cb755d66634f.png"
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
`## ${bell} Hey there, **${interaction.user.username}** — Welcome to **${ticketType.label}**.

> Please ensure you have thoroughly reviewed our Frequently Asked Questions and that your inquiry is unique so our Support Team can provide quality support as soon as possible. If you have any extra information in regards to your inquiry, you're recommended to add it here.`
                                    },

                                    {
                                        type: 14,
                                        spacing: 2,
                                        divider: true
                                    },

                                    {
                                        type: 10,

                                        content:
`## ${info} **User Information**

> ${book} **Username:** ${interaction.user.username}
> ${megaphone} **Display Name:** ${interaction.member.displayName}
> ${star} **Created:** <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:D>`
                                    },

                                    {
                                        type: 14,
                                        spacing: 1,
                                        divider: true
                                    },

                                    {
                                        type: 10,

                                        content:
`## **Reason**

> ${cleanMentions(reason).replace(/\n/g, "\n> ")}`
                                    },

                                    {
                                        type: 14,
                                        spacing: 1,
                                        divider: true
                                    },

                                    {
                                        type: 1,

                                        components: [
                                            {
                                                type: 2,
                                                style: 3,
                                                label:
                                                    "Claim",

                                                custom_id:
                                                    "ticket_claim"
                                            },

                                            {
                                                type: 2,
                                                style: 4,
                                                label:
                                                    "Close",

                                                custom_id:
                                                    "ticket_close"
                                            }
                                        ]
                                    },

                                    {
                                        type: 14,
                                        spacing: 2,
                                        divider: true
                                    },

                                    {
                                        type: 12,

                                        items: [
                                            {
                                                media: {
                                                    url:
                                                        BOTTOM_IMAGE
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    });

                    await interaction.editReply({
                        content:
                            `Your **${ticketType.label}** ticket has been created: ${ticketChannel}`
                    });

                } catch (error) {
                    trackError(
                        "ticket",
                        error
                    );

                    if (
                        interaction.deferred ||
                        interaction.replied
                    ) {
                        await interaction.editReply({
                            content:
                                "I couldn't create your ticket. Check the terminal."
                        }).catch(() => {});
                    }
                }

                return;
            }

            // ==================================================
            // CLAIM
            // ==================================================

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "ticket_claim"
            ) {
                const CLAIM_ROLE_ID =
                    "1555284465318764724";

                if (
                    !interaction.member.roles.cache.has(
                        CLAIM_ROLE_ID
                    )
                ) {
                    return interaction.reply({
                        content:
                            "You don't have permission to claim tickets.",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                const alreadyClaimed =
                    getClaimedUserId(
                        interaction.channel
                    );

                if (alreadyClaimed) {
                    return interaction.reply({
                        content:
                            `This ticket has already been claimed by <@${alreadyClaimed}>.`,
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                await interaction.channel.setTopic(
                    `${interaction.channel.topic || "ticket"} | ticket-claimed:${interaction.user.id}`
                );

                managementStats.tickets.claimed++;

                saveManagementStats();

                addManagementActivity(
                    `🎫 Ticket claimed by @${interaction.user.username}`
                );

                await interaction.reply({
                    content:
                        `**${interaction.user} has claimed this ticket.**`
                });

                return;
            }

            // ==================================================
            // CLOSE + TRANSCRIPT + LOG
            // ==================================================

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "ticket_close"
            ) {
                const ticketChannel =
                    interaction.channel;

                const ticketNumber =
                    getNextTicketNumber();

                const openedMatch =
                    ticketChannel.topic?.match(
                        /ticket-owner:(\d+)/
                    );

                const openedBy =
                    openedMatch
                        ? openedMatch[1]
                        : interaction.user.id;

                const claimedBy =
                    getClaimedUserId(
                        ticketChannel
                    );

                const ticketType =
                    getTicketTypeFromChannel(
                        ticketChannel
                    );

                const reason =
                    await getTicketReason(
                        ticketChannel
                    );

                await interaction.reply({
                    content:
`⏳ **Closing**

> **Closing by:** ${interaction.user}

This ticket will close in **5 seconds**.`
                });

                setTimeout(
                    async () => {
                        try {
                            console.log(
                                `[TICKET] Closing ticket ${ticketChannel.name}`
                            );

                            const transcriptHtml =
                                await discordTranscripts.createTranscript(
                                    ticketChannel,
                                    {
                                        limit:
                                            -1,

                                        returnType:
                                            "string",

                                        saveImages:
                                            false,

                                        poweredBy:
                                            true
                                    }
                                );

                            const transcriptUrl =
                                await uploadTranscriptOnline(
                                    ticketNumber,
                                    transcriptHtml
                                );

                            await createTicketLog({
                                ticketNumber,
                                openedBy,
                                ticketType,
                                reason,
                                claimedBy,
                                closedBy:
                                    interaction.user.id,
                                transcriptUrl
                            });

                            managementStats.tickets.closed++;

                            saveManagementStats();

                            addManagementActivity(
                                `🎫 Ticket #${ticketNumber} closed by @${interaction.user.username}`
                            );

                            await ticketChannel.delete(
                                `Ticket closed by ${interaction.user.tag}`
                            );

                        } catch (error) {
                            trackError(
                                "ticket close",
                                error
                            );

                            await ticketChannel.delete(
                                `Ticket closed by ${interaction.user.tag}`
                            ).catch(() => {});
                        }
                    },
                    5000
                );

                return;
            }

            // ==================================================
            // APPLICATION CANCEL
            // ==================================================

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "staff_application_cancel"
            ) {
                const application =
                    applications.get(
                        interaction.channel.id
                    );

                if (
                    !application ||
                    application.userId !==
                        interaction.user.id
                ) {
                    return interaction.reply({
                        content:
                            "You cannot cancel this application.",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                if (
                    application.completed
                ) {
                    return interaction.reply({
                        content:
                            "This application has already been completed.",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

                application.completed =
                    true;

                applications.set(
                    interaction.channel.id,
                    application
                );

                await interaction.reply({
                    content:
`**Application Cancelled**

Your application has been cancelled.

This channel will be deleted in **5 seconds**.`
                });

                setTimeout(
                    async () => {
                        await interaction.channel.delete(
                            "Staff application cancelled by applicant"
                        ).catch(() => {});

                        applications.delete(
                            interaction.channel.id
                        );
                    },
                    5000
                );

                return;
            }

            // ==================================================
            // APPROVE
            // ==================================================

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "staff_application_approve:"
                )
            ) {
                const applicantId =
                    interaction.customId.split(
                        ":"
                    )[1];

                await approveApplication(
                    interaction,
                    applicantId
                );

                return;
            }

            // ==================================================
            // DENY
            // ==================================================

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "staff_application_deny:"
                )
            ) {
                const applicantId =
                    interaction.customId.split(
                        ":"
                    )[1];

                await denyApplication(
                    interaction,
                    applicantId
                );

                return;
            }

            // ==================================================
            // REVIEWED
            // ==================================================

            if (
                interaction.isButton() &&
                interaction.customId.startsWith(
                    "staff_application_reviewed:"
                )
            ) {
                return interaction.reply({
                    content:
                        "This application has already been reviewed and the buttons are locked.",
                    flags:
                        MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            trackError(
                "interaction",
                error
            );

            console.error(
                "INTERACTION ERROR:",
                error
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        "Something went wrong. Check the bot console.",
                    flags:
                        MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    }
);

// ======================================================
// APPLICATION ANSWERS
// ======================================================

client.on(
    "messageCreate",
    async message => {
        if (message.author.bot)
            return;

        await handleERLCMessage(message);

        const application =
            applications.get(
                message.channel.id
            );

        if (!application)
            return;

        if (
            application.userId !==
            message.author.id
        ) {
            return;
        }

        if (
            application.completed
        ) {
            return;
        }

        if (
            Date.now() -
                application.startedAt >=
            APPLICATION_TIMEOUT
        ) {
            application.completed =
                true;

            await message.channel.delete(
                "Staff application exceeded 30 minute limit"
            ).catch(() => {});

            applications.delete(
                message.channel.id
            );

            return;
        }

        const question =
            APPLICATION_QUESTIONS[
                application.questionIndex
            ];

        if (!question)
            return;

        const answer =
            message.content.trim();

        if (!answer)
            return;

        application.answers[
            question.id
        ] = answer;

        application.questionIndex++;

        applications.set(
            message.channel.id,
            application
        );

        if (
            application.questionIndex >=
            APPLICATION_QUESTIONS.length
        ) {
            await finishApplication(
                message.channel,
                application
            );

            return;
        }

        await sendApplicationQuestion(
            message.channel,
            application
        );
    }
);

// ======================================================
// ERROR HANDLERS
// ======================================================

client.on(
    "error",
    error => {
        trackError(
            "client",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {
        trackError(
            "unhandled rejection",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        trackError(
            "uncaught exception",
            error
        );
    }
);

// ======================================================
// LIVE DASHBOARD LOOP
// ======================================================

setInterval(
    async () => {
        if (
            client.isReady() &&
            managementDashboard
        ) {
            await updateManagementDashboard();
        }
    },
    DASHBOARD_UPDATE_INTERVAL
);

// ======================================================
// MEMBER JOIN WELCOME
// ======================================================

client.on(
    "guildMemberAdd",
    async member => {
        try {
            const channel =
                await member.guild.channels.fetch(
                    "1555276207774236702"
                );

            if (
                !channel ||
                !channel.isTextBased()
            ) {
                console.error(
                    "[WELCOME] Welcome channel not found."
                );
                return;
            }

            await channel.send({
                content:
                    `Hey <@${member.id}>, welcome to the **Golden Cross City of Los Angeles**! We hope you enjoy your stay here. 🌴`
            });

            console.log(
                `[WELCOME] Welcomed ${member.user.tag}`
            );

        } catch (error) {
            console.error(
                "[WELCOME ERROR]",
                error
            );
        }
    }
);

// ======================================================
// LOGIN
// ======================================================

client.login(
    process.env.TOKEN
);