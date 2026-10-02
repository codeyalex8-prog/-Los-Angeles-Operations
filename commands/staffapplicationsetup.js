const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("staffapplicationsetup")
        .setDescription("Post the Los Angeles State Roleplay staff applications panel.")
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
                                    url: "https://discord-webhook.com/uploads/921574de45f213177862c9fe089123f9.png"
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

                    // STAFF APPLICATIONS
                    {
                        type: 10,
                        content:
`# Staff Applications

> Interested in joining the staff team? You can get started by completing the application below. Please ensure all information you provide is accurate and detailed, as applications are carefully reviewed to select individuals who will contribute positively to the community and uphold standards.

> To begin, choose the **Staff Application** option from the dropdown. After making your selection, you will be added to a private channel with the next steps.`
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    // BEFORE APPLYING
                    {
                        type: 10,
                        content:
`# Before Applying

> **Staff Applications:** Applicants must be **13 years or older**.

> Please have your **Roblox username, Roblox user ID, timezone**, and any other relevant details ready before applying.`
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    // APPLICATION REVIEW
                    {
                        type: 10,
                        content:
`# Application Review

> All applications are reviewed by the **high-ranking team**. You will be notified of the outcome via DM — please be patient.

> Trolling or submitting false information will result in a **permanent blacklist**.`
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    // ONE DROPDOWN
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "staff_application",
                                placeholder: "Select an application",
                                options: [
                                    {
                                        label: "Staff Application",
                                        value: "staff_application",
                                        description: "Apply to join the staff team.",
                                        emoji: {
                                            id: "1555288444647899198",
                                            name: "401776book"
                                        }
                                    }
                                ]
                            }
                        ]
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
                content: "Staff Applications panel posted.",
                flags: 64
            });

        } catch (error) {

            console.error("");
            console.error("========== STAFF APPLICATION ERROR ==========");
            console.error(error);
            console.error("=============================================");
            console.error("");

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "I couldn't post the Staff Applications panel. Check the terminal.",
                    flags: 64
                });
            }
        }
    }
};