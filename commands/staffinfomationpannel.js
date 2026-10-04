const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("staffinfomationpannel")
        .setDescription("Post the Staff Information panel"),

    async execute(interaction) {
        await interaction.reply({
            content: "Staff Information panel posted.",
            flags: MessageFlags.Ephemeral
        });

        await interaction.channel.send({
            flags: MessageFlags.IsComponentsV2,

            components: [
                {
                    type: 17,

                    components: [
                        {
                            type: 12,
                            items: [
                                {
                                    media: {
                                        url: "https://discord-webhook.com/uploads/91d16da274ce39880ce136199785179a.png"
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
`**Staff Guide**

> <:685951info:1555288511622549647> *As a member of the **Los Angeles State Roleplay** Staff Team, you are provided with essential tools, documentation, and resources to help you throughout your time on the team. Staff are held to high standards, and it is important that all staff members understand and maintain these expectations.*

> <:401776book:1555288511622549647> **Staff Handbook**
> Your main source for staff rules, procedures, commands, quotas and expectations. Make sure you are familiar with the handbook and refer back to it whenever necessary.

> <:570616gearicon:1555288511622549647> **Leave of Absence**
> Staff members can request an **LOA** through the staff dashboard. **Do not open a ticket to request an LOA.**
> If your request has not been accepted after a couple of days, you may then contact the appropriate staff team for assistance.

> <:1882megaphone:1555288511622549647> **Important**
> Staff resources are strictly for internal staff use. Under no circumstances should staff resources, documentation, access codes or internal information be shared with members or leaked outside of staff channels.

> <:693596winterstar:1555288511622549647> **Staff Expectations**
> Always remain professional, follow the chain of command, use your permissions responsibly and ensure you are familiar with the information provided in the staff handbook.`
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
                                    type: 2,
                                    style: 5,
                                    label: "Roblox Group",
                                    url: "https://www.roblox.com/share/g/346957997"
                                },

                                {
                                    type: 2,
                                    style: 5,
                                    label: "Melonly",
                                    url: "https://melon.ly/join/WZZDAY"
                                },

                                {
                                    type: 2,
                                    style: 5,
                                    label: "Staff Guide",
                                    url: "https://docs.google.com/document/d/1NZyN6W4lVVxoL1W6h31aLBMml2b04vjBslBHpGywg-Y/edit?usp=sharing"
                                },

                                {
                                    type: 2,
                                    style: 5,
                                    label: "Support Team Guide",
                                    url: "https://docs.google.com/document/d/1Hkim7pyEzV4M6m3eV82THi6HQWPJCLC402gw2L5DZdc/edit?usp=sharing"
                                }
                            ]
                        },

                        {
                            type: 12,
                            items: [
                                {
                                    media: {
                                        url: "https://discord-webhook.com/uploads/8d3e65a56082c2425d8ed7a95190158f.png"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    }
};