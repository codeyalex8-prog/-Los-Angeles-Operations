const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dashboardsetup")
        .setDescription("Post the Los Angeles State Roleplay dashboard."),

    async execute(interaction) {
        try {
            const getEmoji = (name) => {
                const emoji = interaction.guild.emojis.cache.find(
                    e => e.name === name
                );

                return emoji ? emoji.toString() : `:${name}:`;
            };

            const bell = getEmoji("944992bell");
            const pencil = getEmoji("904340pencil");
            const controller = getEmoji("875408controller");
            const gavel = getEmoji("998896gavel");
            const gear = getEmoji("570616gearicon");
            const giveaway = getEmoji("463819giveaway");
            const openedMail = getEmoji("537744openedmail");
            const book = getEmoji("401776book");
            const microphone = getEmoji("308605microphone");
            const cash = getEmoji("249884cash");
            const winterStar = getEmoji("693596winterstar");
            const info = getEmoji("685951info");
            const megaphone = getEmoji("1882megaphone");
            const house = getEmoji("13860house");

            await interaction.channel.send({
                flags: 32768,

                components: [
                    {
                        type: 17,

                        components: [

                            // TOP IMAGE
                            {
                                type: 12,
                                items: [
                                    {
                                        media: {
                                            url: "https://discord-webhook.com/uploads/91fb5ac9c0f1b83fd9760fdff53d2a44.png"
                                        }
                                    }
                                ]
                            },

                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            },

                            // DASHBOARD
                            {
                                type: 10,
                                content:
`# **Dashboard**

> **Los Angeles State Roleplay** is a dynamic Roblox experience based in **Emergency Response: Liberty County**. Take on the role of a **police officer, firefighter, EMS, state trooper, federal agent, or civilian** as you navigate a realistic and immersive open-world environment.

> Engage in detailed **roleplay scenarios**, meet new people, and experience a community built around **realism, activity, and immersive gameplay**.`
                            },

                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            },

                            // CHAIN OF COMMAND
                            {
                                type: 10,
                                content:
`${bell} **Chain of Command**

> ${gavel} **Founder** — <@&1555279468946526349>

> ${gavel} **Co Founder** — <@&1555279470078730370>

> ${gavel} **Directors** — <@&1555279475585974395>

> ${gear} **Management** — <@&1555279482003263708>

> ${info} **Internal Affairs** — <@&1555279489309872408>

> ${book} **Administration** — <@&1555279495575904408>

> ${microphone} **Moderation** — <@&1555280975972278312>`
                            },

                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            },

                            // MAIN CHANNELS
                            {
                                type: 10,
                                content:
`${openedMail} **Main Channels**

> ${controller} **Sessions** — <#1555276078845661275>

> ${pencil} **Applications** — <#1555276146382344242>

> ${megaphone} **Shouts** — <#1555276971666309140>

> ${house} **General** — <#1555276207774236702>`
                            },

                            {
                                type: 14,
                                spacing: 2,
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
                ]
            });

            await interaction.reply({
                content: "Dashboard posted.",
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error("\n========== DASHBOARD ERROR ==========");
            console.error(error);
            console.error("=====================================\n");

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "Something went wrong while posting the dashboard. Check the terminal.",
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};