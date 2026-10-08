const {
    SlashCommandBuilder,
    MessageFlags,
    ComponentType
} = require("discord.js");

const TOP_IMAGE =
    "https://discord-webhook.com/uploads/8e0f3b993b06fb6f3e168d99c98e92d3.png";

const BOTTOM_IMAGE =
    "https://discord-webhook.com/uploads/5a2d39e650b6cab0ae6f0d9d5d8ba44d.png";

const CHP_LINK =
    "https://discord.gg/kUqcF2xwhu";

function buildDepartmentsPanel() {
    return [
        {
            type: 17,

            components: [
                {
                    type: 12,
                    items: [
                        {
                            media: {
                                url: TOP_IMAGE
                            }
                        }
                    ]
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 10,
                    content:
`# Departments

> **Los Angeles State Roleplay** offers a variety of departments designed to provide unique and immersive experiences across the city.

> From law enforcement to emergency services and federal operations, each department plays an important role in keeping Los Angeles active and engaging.

> Select a department below to view more information about its current status and available resources.`
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
                            custom_id: "lasrp_departments_select",
                            placeholder: "Select a department",
                            min_values: 1,
                            max_values: 1,

                            options: [
                                {
                                    label: "CHP",
                                    description: "View CHP department information",
                                    value: "chp"
                                },
                                {
                                    label: "LAPD",
                                    description: "View the LAPD department status",
                                    value: "lapd"
                                },
                                {
                                    label: "LAFD",
                                    description: "View the LAFD department status",
                                    value: "lafd"
                                },
                                {
                                    label: "FBI",
                                    description: "View the FBI department status",
                                    value: "fbi"
                                }
                            ]
                        }
                    ]
                },

                {
                    type: 14,
                    spacing: 1,
                    divider: true
                },

                {
                    type: 12,
                    items: [
                        {
                            media: {
                                url: BOTTOM_IMAGE
                            }
                        }
                    ]
                }
            ]
        }
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deptpannelsetup")
        .setDescription("Set up the LASRP departments panel."),

    async execute(interaction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const message = await interaction.channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: buildDepartmentsPanel()
            });

            await interaction.editReply({
                content: "The **Departments** panel has been successfully set up."
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.StringSelect
            });

            collector.on("collect", async selectInteraction => {
                if (
                    selectInteraction.customId !==
                    "lasrp_departments_select"
                ) {
                    return;
                }

                const selected = selectInteraction.values[0];

                if (selected === "chp") {
                    await selectInteraction.reply({
                        content:
`### CHP

> The **California Highway Patrol** is currently operational within Los Angeles State Roleplay.

> Use the link below to access the CHP department.

**CHP Discord:** ${CHP_LINK}`,
                        flags: MessageFlags.Ephemeral
                    });

                    return;
                }

                if (selected === "lapd") {
                    await selectInteraction.reply({
                        content:
`### LAPD

> The **Los Angeles Police Department** is currently being prepared for release within Los Angeles State Roleplay.

> Our team is currently working on the department and its systems. Further information will be released once it is ready.`,
                        flags: MessageFlags.Ephemeral
                    });

                    return;
                }

                if (selected === "lafd") {
                    await selectInteraction.reply({
                        content:
`### LAFD

> The **Los Angeles Fire Department** is currently being prepared for release within Los Angeles State Roleplay.

> Our team is currently working on the department and its systems. Further information will be released once it is ready.`,
                        flags: MessageFlags.Ephemeral
                    });

                    return;
                }

                if (selected === "fbi") {
                    await selectInteraction.reply({
                        content:
`### FBI

> The **Federal Bureau of Investigation** is currently being prepared for release within Los Angeles State Roleplay.

> Our team is currently working on the department and its systems. Further information will be released once it is ready.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            });

        } catch (error) {
            console.error("[DEPARTMENTS PANEL ERROR]", error);

            await interaction.editReply({
                content:
                    "I couldn't create the Departments panel. Check the bot console for the error."
            });
        }
    }
};