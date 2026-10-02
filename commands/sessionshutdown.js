const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sessionshutdown")
        .setDescription("Post the Los Angeles State Roleplay Session Shutdown panel.")
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
                                    url: "https://discord-webhook.com/uploads/9b58cec88bc29fbed98a8df6ca101caf.png"
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

                    // SESSION SHUTDOWN
                    {
                        type: 10,
                        content:
`# Session Shutdown

> The current session has now been shut down. Please begin leaving the server and return to the Discord while the session is concluded.

**Server Name:** \`Los Angeles State Roleplay\`
**Join Code:** \`LArPIF\`

> Thank you to everyone who participated in the session. We appreciate everyone who joined and helped keep the session active.`
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
                content: "Session Shutdown panel posted.",
                flags: 64
            });

        } catch (error) {

            console.error("");
            console.error("========== SESSION SHUTDOWN ERROR ==========");
            console.error(error);
            console.error("============================================");
            console.error("");

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "I couldn't post the Session Shutdown panel. Check the terminal.",
                    flags: 64
                });
            }
        }
    }
};