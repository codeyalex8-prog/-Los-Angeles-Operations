const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sessionboost")
        .setDescription("Post the Los Angeles State Roleplay Session Boost panel.")
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
                                    url: "https://discord-webhook.com/uploads/8ae6df56f60b61c9dde7e115ce63536f.png"
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

                    // SESSION BOOST
                    {
                        type: 10,
                        content:
`# Session Boost

**<@&1555284465318764724>** **<@&1555281818935103568>**

> Our session is currently looking for more players! If you're available, please consider joining the server and helping us boost activity.

**Server Name:** \`Los Angeles State Roleplay\`
**Join Code:** \`LArPIF\`

> Every player helps keep the session active, so come join us and get involved!`
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
                content: "Session Boost panel posted.",
                flags: 64
            });

        } catch (error) {

            console.error("");
            console.error("========== SESSION BOOST ERROR ==========");
            console.error(error);
            console.error("=========================================");
            console.error("");

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "I couldn't post the Session Boost panel. Check the terminal.",
                    flags: 64
                });
            }
        }
    }
};