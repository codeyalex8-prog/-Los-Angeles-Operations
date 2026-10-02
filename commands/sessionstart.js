const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sessionstart")
        .setDescription("Announce that a session has started.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const now = new Date();

        const date = now.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        const time = now.toLocaleTimeString("en-GB", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });

        const username = interaction.user.username;

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
                                    url: "https://discord-webhook.com/uploads/0f29dbbc461a621438710a56010d1a6b.png"
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

                    // SESSION START
                    {
                        type: 10,
                        content:
`# Session Start

**<@&1555284465318764724>** **<@&1555281818935103568>**

> A session has been initiated. At this time, we're asking those who voted during the waiting period to join. If you've voted for this session and don't join, you will face moderation action.

**Server Name:** \`Los Angeles State Roleplay\`
**Join Code:** \`LArPIF\`

${username} • ${date} ${time}`
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
                content: "Session start announcement posted.",
                flags: 64
            });

        } catch (error) {

            console.error("");
            console.error("========== SESSION START ERROR ==========");
            console.error(error);
            console.error("=========================================");
            console.error("");

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "I couldn't post the session announcement. Check the terminal.",
                    flags: 64
                });
            }
        }
    }
};