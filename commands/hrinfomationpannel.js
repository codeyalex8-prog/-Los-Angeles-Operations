const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hrinfomationpannel")
        .setDescription("Post the HR Information panel"),

    async execute(interaction) {

        await interaction.reply({
            content: "HR Information panel posted.",
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
                                        url: "https://discord-webhook.com/uploads/77f8c0f20da49432ea342b8b5688cc85.png"
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
`**:998896gavel: HR INFORMATION**

> **:401776book: High Rank Responsibilities**
> • Lead and support staff
> • Handle staff situations professionally
> • Help manage server operations
> • Set a good example for all staff
> • Follow the chain of command
> • Keep staff matters professional and confidential

**:570616gearicon: HR EXPECTATIONS**

> • Use your permissions responsibly
> • Do not abuse your rank
> • Remain professional at all times
> • Treat everyone fairly
> • Follow all server rules and procedures
> • Work together with other HR members

**:685951info: IMPORTANT**

> Your HR position is a position of responsibility. Having a high rank does not mean you are above the rules. Any abuse of permissions or authority may result in disciplinary action.

**:944992bell: STAFF ISSUES**

> If you have an issue with a staff member or are unsure how to handle a situation, contact a higher-ranking member of staff before taking action.

**:1882megaphone: REMEMBER**

> Represent **Los Angeles State RolePlay** properly and help maintain a professional, welcoming and organised community.

**Los Angeles State RolePlay**

> *Leadership • Professionalism • Teamwork*`
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
                                    label: "HR Guide",
                                    url: "https://docs.google.com/document/d/113Hr90CP4KygcmIA3VbhNcQYmXwnmACm0GOpbsDdgdc/edit?usp=sharing"
                                },

                                {
                                    type: 2,
                                    style: 2,
                                    label: "HR Infomation",
                                    custom_id: "hr_information"
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