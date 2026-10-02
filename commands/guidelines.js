const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("guidelines")
        .setDescription("Post the Los Angeles State Roleplay guidelines."),

    async execute(interaction) {

        // Respond to Discord IMMEDIATELY
        await interaction.reply({
            content: "Posting guidelines panel...",
            flags: MessageFlags.Ephemeral
        });

        try {

            const getEmoji = (name) => {
                const emoji = interaction.guild.emojis.cache.find(
                    emoji => emoji.name === name
                );

                return emoji ? emoji.toString() : "";
            };

            const robloxEmoji = getEmoji("480026robloxlogo");
            const discordEmoji = getEmoji("9738discordico");

            await interaction.channel.send({
                flags: 32768,

                components: [
                    {
                        type: 17,

                        components: [

                            {
                                type: 12,
                                items: [
                                    {
                                        media: {
                                            url: "https://discord-webhook.com/uploads/62dfbd3e742460896e60890a80b79a6c.png"
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
`# **Guidelines**

> To help maintain a strong and respectful community environment, we ask that all members adhere to our guidelines. By following these rules, we can ensure that everyone has a positive experience while engaging with our community. Please take a moment to review the guidelines below and help us create a welcoming space for all members.`
                            },

                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            },

                            {
                                type: 10,
                                content:
`### **Regulations Index**

> **Discord Guidelines**

> **Game Guidelines**`
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
                                        type: 3,
                                        custom_id: "lasrp_guidelines_select",
                                        placeholder: "Select a guideline",

                                        options: [
                                            {
                                                label: "Roblox ToS",
                                                value: "roblox_tos",
                                                emoji: robloxEmoji
                                                    ? {
                                                        id: interaction.guild.emojis.cache.find(
                                                            e => e.name === "480026robloxlogo"
                                                        ).id,
                                                        name: "480026robloxlogo"
                                                    }
                                                    : undefined
                                            },

                                            {
                                                label: "Discord ToS",
                                                value: "discord_tos",
                                                emoji: discordEmoji
                                                    ? {
                                                        id: interaction.guild.emojis.cache.find(
                                                            e => e.name === "9738discordico"
                                                        ).id,
                                                        name: "9738discordico"
                                                    }
                                                    : undefined
                                            }
                                        ]
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
                                            url: "https://discord-webhook.com/uploads/bb5f14a71e4668885d2c0f6da52caa20.png"
                                        }
                                    }
                                ]
                            }

                        ]
                    }
                ]
            });

            await interaction.editReply({
                content: "Guidelines panel posted."
            });

        } catch (error) {

            console.error("");
            console.error("========== GUIDELINES ERROR ==========");
            console.error(error);
            console.error("======================================");
            console.error("");

            await interaction.editReply({
                content: "The panel failed to post. Check the VS Code terminal."
            });
        }
    }
};