const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sessioninfopanel")
        .setDescription("Post the Los Angeles State Roleplay session information panel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const components = [
            {
                type: 17,

                components: [

                    // TOP IMAGE
                    {
                        type: 12,
                        items: [
                            {
                                media: {
                                    url: "https://discord-webhook.com/uploads/3173c3c4cb0c3c0489e782e4ba74cc1c.png"
                                }
                            }
                        ]
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 2,
                        divider: true
                    },

                    // SESSIONS
                    {
                        type: 10,
                        content:
`# <:944992bell:1555288511622549647> Sessions

> Los Angeles State Roleplay sessions run 24/7, aside from a handful of scheduled breaks. Hop in any time using the Quick-Join button below.`
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    // ER:LC SERVER INFORMATION
                    {
                        type: 10,
                        content:
`### ER\\:LC Server Information

- Server Name: \`-\`
- Server Join Code: \`-\`
- Server Owner: \`-\``
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 2,
                        divider: true
                    },

                    // SERVER STATISTICS
                    {
                        type: 10,
                        content:
`### Server Statistics

- Player Count: \`-\`
- Online Staff: \`-\`
- In Queue: \`-\``
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    // BOTTOM IMAGE
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
        ];

        try {

            await interaction.channel.send({
                flags: 32768,
                components
            });

            await interaction.reply({
                content: "Session information panel posted.",
                flags: 64
            });

        } catch (error) {

            console.error("");
            console.error("========== SESSION PANEL ERROR ==========");
            console.error(error);
            console.error("=========================================");
            console.error("");

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "I couldn't post the session panel. Check the terminal.",
                    flags: 64
                });
            }
        }
    }
};