const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("assistance")
        .setDescription("Post the Los Angeles State Roleplay assistance panel."),

    async execute(interaction) {
        try {
            const getEmoji = (name) => {
                const emoji = interaction.guild.emojis.cache.find(
                    e => e.name === name
                );

                if (!emoji) {
                    console.log(`[EMOJI NOT FOUND] ${name}`);
                    return null;
                }

                return {
                    id: emoji.id,
                    name: emoji.name
                };
            };

            const bell = getEmoji("944992bell");
            const openedMail = getEmoji("537744openedmail");
            const gavel = getEmoji("998896gavel");
            const gear = getEmoji("570616gearicon");

            console.log("[EMOJIS]");
            console.log("Bell:", bell);
            console.log("Opened Mail:", openedMail);
            console.log("Gavel:", gavel);
            console.log("Gear:", gear);

            await interaction.reply({
                content: "Assistance panel posted.",
                flags: MessageFlags.Ephemeral
            });

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
                                            url: "https://discord-webhook.com/uploads/db3500b0b677deb15720cb755d66634f.png"
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
`# ${bell ? `<:${bell.name}:${bell.id}>` : "🔔"} **Contact Us — Los Angeles State Roleplay**

> Need assistance? Open a ticket and our team will be ready to help. Choose the category that matches your issue below and a private channel will be opened for you.`
                            },

                            {
                                type: 14,
                                spacing: 2,
                                divider: true
                            },

                            {
                                type: 10,
                                content:
`# **Choose Your Category**

> ${openedMail ? `<:${openedMail.name}:${openedMail.id}>` : "📬"} **General:** Questions, support, and assistance from any staff member.

> ${gavel ? `<:${gavel.name}:${gavel.id}>` : "⚖️"} **High Rank:** Escalated concerns requiring senior staff attention.

> ${gear ? `<:${gear.name}:${gear.id}>` : "⚙️"} **Department:** Department-related or high-priority leadership matters.`
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
                                        custom_id: "lasrp_assistance_category",
                                        placeholder: "Select a category",

                                        options: [
                                            {
                                                label: "General Support",
                                                description: "Questions, support, and general assistance.",
                                                value: "general",
                                                ...(openedMail
                                                    ? { emoji: openedMail }
                                                    : {})
                                            },

                                            {
                                                label: "High Rank",
                                                description: "Escalated concerns requiring senior staff attention.",
                                                value: "high_rank",
                                                ...(gavel
                                                    ? { emoji: gavel }
                                                    : {})
                                            },

                                            {
                                                label: "Department",
                                                description: "Department-related or high-priority leadership matters.",
                                                value: "department",
                                                ...(gear
                                                    ? { emoji: gear }
                                                    : {})
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

        } catch (error) {
            console.error("");
            console.error("========== ASSISTANCE ERROR ==========");
            console.error(error);
            console.error("======================================");
            console.error("");
        }
    }
};