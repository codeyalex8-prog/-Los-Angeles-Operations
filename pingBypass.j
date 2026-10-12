const { Events } = require("discord.js");

const PROTECTED_USER_IDS = new Set([
    "1540046851279953973",
    "1425353679598518276",
]);

const PROTECTED_ROLE_ID = "1555279476949258320";
const BYPASS_ROLE_ID = "1559285532360581210";

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (!message.inGuild() || message.author.bot) return;

        try {
            const member =
                message.member ??
                await message.guild.members.fetch(message.author.id);

            // Only this exact role grants permission.
            // Administrator permissions alone do NOT bypass this check.
            if (member.roles.cache.has(BYPASS_ROLE_ID)) return;

            const protectedUserPinged = message.mentions.users.some(user =>
                PROTECTED_USER_IDS.has(user.id)
            );

            const protectedRolePinged =
                message.mentions.roles.has(PROTECTED_ROLE_ID);

            if (!protectedUserPinged && !protectedRolePinged) return;

            await message.delete();

            console.log(
                `[Ping Bypass] Deleted unauthorised ping by ${message.author.tag} in #${message.channel.name}`
            );
        } catch (error) {
            console.error("[Ping Bypass] Failed to enforce ping restriction:", error);
        }
    },
};