const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("marketplacesetup")
        .setDescription("Post the Los Angeles State Roleplay Marketplace panel.")
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
                                    url: "https://discord-webhook.com/uploads/8d8a058f2814e1ba8ab9fba0eca574b5.png"
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

                    // MARKETPLACE TEXT
                    {
                        type: 10,
                        content:
`# Marketplace

> We offer a large range of different products inside of our marketplace. All transactions are final, and we do not offer refunds to users who decide they no longer want their purchase.

> We only accept **Robux** payments. Real-world money is not accepted at this time.`
                    },

                    // DIVIDER
                    {
                        type: 14,
                        spacing: 2,
                        divider: true
                    },

                    // DISABLED DROPDOWN
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "marketplace_disabled",
                                placeholder: "Marketplace Products",
                                disabled: true,
                                options: [
                                    {
                                        label: "Products",
                                        value: "products",
                                        description: "Marketplace products will be available soon."
                                    },
                                    {
                                        label: "Services",
                                        value: "services",
                                        description: "Marketplace services will be available soon."
                                    },
                                    {
                                        label: "Purchases",
                                        value: "purchases",
                                        description: "Purchase options will be available soon."
                                    }
                                ]
                            }
                        ]
                    },

                    // DIVIDER
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
        ];

        try {

            await interaction.channel.send({
                flags: 32768,
                components
            });

            await interaction.reply({
                content: "Marketplace panel posted.",
                flags: 64
            });

        } catch (error) {

            console.error("");
            console.error("========== MARKETPLACE ERROR ==========");
            console.error(error);
            console.error("=======================================");
            console.error("");

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "I couldn't post the Marketplace panel. Check the terminal.",
                    flags: 64
                });
            }
        }
    }
};