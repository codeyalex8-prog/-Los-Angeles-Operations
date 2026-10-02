const {
    SlashCommandBuilder
} = require("discord.js");

const dashboard =
    require("../dashboard");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dashboardsetup")
        .setDescription(
            "Create the live bot management dashboard"
        ),

    async execute(interaction) {
        await dashboard.setupDashboard(
            interaction
        );
    }
};