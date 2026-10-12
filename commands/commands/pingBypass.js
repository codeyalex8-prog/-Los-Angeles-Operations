const {
    Events,
    PermissionFlagsBits,
} = require("discord.js");

const PROTECTED_USER_IDS = [
    "1540046851279953973",
    "1425353679598518276",
];

const PROTECTED_ROLE_ID = "1555279476949258320";
const BYPASS_ROLE_ID = "1559285532360581210";

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        try {
            if (!message.inGuild()) return;
            if (message.author.bot) return;

            // Only allow people with the bypass role to ping protected targets.
            const member = message.member;
            if (!member) return;

            const hasBypassRole = member.roles.cache.has(BYPASS_ROLE_ID);

            if (hasBypassRole) return;

            // Check direct user mentions.
            const pingsProtectedUser = message.mentions.users.some(user =>
                PROTECTED_USER_IDS.includes(user.id)
            );

            // Check role mentions, including @everyone/@here-safe role checks.
            const pingsProtectedRole =
                message.mentions.roles.has(PROTECTED_ROLE_ID);

            if (!pingsProtectedUser && !pingsProtectedRole) return;

            // Delete the unauthorised ping.
            await message.delete().catch(() => null);

            // Optional warning in the channel.
            const warning = await message.channel.send({
                content: `${message.author}, you don't have permission to ping that user or role.`,
                allowedMentions: { users: [message.author.id] },
            }).catch(() => null);

            if (warning) {
                setTimeout(() => {
                    warning.delete().catch(() => null);
                }, 5000);
            }
        } catch (error) {
            console.error("[Ping Bypass] Error:", error);
        }
    },
};