const {
    EmbedBuilder
} = require("discord.js");

const ERLC_API = "https://api.erlc.gg";

const STAFF_ROLE_ID = "1555284465318764724";

async function erlcRequest(endpoint, options = {}) {
    const apiKey = process.env.ERLC_SERVER_KEY;

    if (!apiKey) {
        throw new Error("ERLC_SERVER_KEY is missing from .env");
    }

    const response = await fetch(`${ERLC_API}${endpoint}`, {
        ...options,
        headers: {
            "Server-Key": apiKey,
            "Accept": "application/json",
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    if (!response.ok) {
        throw new Error(
            `ER:LC API ${response.status}: ${
                typeof data === "string"
                    ? data
                    : JSON.stringify(data)
            }`
        );
    }

    return data;
}

async function getPlayers() {
    const data = await erlcRequest(
        "/v2/server?Players=true"
    );

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data.Players)) {
        return data.Players;
    }

    return [];
}

function formatPlayer(player) {
    if (typeof player === "string") {
        return player;
    }

    return (
        player?.Player ||
        player?.Username ||
        player?.username ||
        player?.Name ||
        player?.name ||
        "Unknown Player"
    );
}

async function showPlayers(message) {
    const players = await getPlayers();

    if (players.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle("🌴 Los Angeles State Roleplay")
            .setDescription(
                "There are currently no players in the ER:LC server."
            )
            .setFooter({
                text: "Los Angeles Operations"
            });

        await message.reply({
            embeds: [embed]
        });

        return;
    }

    const playerList = players
        .map((player, index) => {
            return `**${index + 1}.** ${formatPlayer(player)}`;
        })
        .join("\n");

    const embed = new EmbedBuilder()
        .setTitle("🌴 ER:LC Players")
        .setDescription(playerList)
        .addFields({
            name: "Player Count",
            value: `\`${players.length}\``,
            inline: true
        })
        .setFooter({
            text: "Los Angeles Operations"
        })
        .setTimestamp();

    await message.reply({
        embeds: [embed]
    });
}

async function runCommand(message, command) {
    if (!command) {
        await message.reply(
            "Usage: `-erlc command <ER:LC command>`"
        );

        return;
    }

    await erlcRequest("/v1/server/command", {
        method: "POST",
        body: JSON.stringify({
            command: command
        })
    });

    const embed = new EmbedBuilder()
        .setTitle("🌴 ER:LC Command")
        .setDescription(
            `Successfully sent:\n\`\`\`${command}\`\`\``
        )
        .setFooter({
            text: `Executed by ${message.member?.displayName || message.author.username}`
        })
        .setTimestamp();

    await message.reply({
        embeds: [embed]
    });
}

async function handleERLCMessage(message) {
    if (message.author.bot) {
        return;
    }

    if (!message.guild) {
        return;
    }

    if (!message.content.toLowerCase().startsWith("-erlc")) {
        return;
    }

    if (!message.member.roles.cache.has(STAFF_ROLE_ID)) {
        await message.reply(
            "❌ You don't have permission to use ER:LC commands."
        );

        return;
    }

    const args = message.content
        .trim()
        .split(/\s+/);

    args.shift();

    const action = args.shift()?.toLowerCase();

    try {
        if (action === "players") {
            await showPlayers(message);
            return;
        }

        if (action === "command") {
            const command = args.join(" ");

            await runCommand(
                message,
                command
            );

            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("🌴 ER:LC Commands")
            .setDescription(
                [
                    "`-erlc players`",
                    "View everyone currently in the ER:LC server.",
                    "",
                    "`-erlc command <command>`",
                    "Run an ER:LC server command.",
                    "",
                    "**Example:**",
                    "`-erlc command kick dream`"
                ].join("\n")
            )
            .setFooter({
                text: "Los Angeles Operations"
            });

        await message.reply({
            embeds: [embed]
        });

    } catch (error) {
        console.error(
            "[ERLC COMMAND ERROR]",
            error
        );

        await message.reply(
            `❌ ER:LC command failed.\n\`${error.message}\``
        );
    }
}

module.exports = {
    handleERLCMessage
};