const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("staffeedback")
        .setDescription("Submit feedback about a staff member.")
        .addUserOption(option =>
            option
                .setName("staff")
                .setDescription("The staff member you are giving feedback about.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const staff = interaction.options.getUser("staff");

        const modal = new ModalBuilder()
            .setCustomId(`staff_feedback_modal:${staff.id}`)
            .setTitle("Staff Feedback");

        const rating = new TextInputBuilder()
            .setCustomId("staff_feedback_rating")
            .setLabel("Rating")
            .setPlaceholder("Enter a number from 1 to 10")
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(2)
            .setRequired(true);

        const reason = new TextInputBuilder()
            .setCustomId("staff_feedback_reason")
            .setLabel("Reason")
            .setPlaceholder("Explain your feedback...")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(2)
            .setMaxLength(1000)
            .setRequired(true);

        const anonymous = new TextInputBuilder()
            .setCustomId("staff_feedback_anonymous")
            .setLabel("Anonymous?")
            .setPlaceholder("Type yes or no")
            .setStyle(TextInputStyle.Short)
            .setMinLength(2)
            .setMaxLength(3)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(rating),
            new ActionRowBuilder().addComponents(reason),
            new ActionRowBuilder().addComponents(anonymous)
        );

        await interaction.showModal(modal);
    }
};