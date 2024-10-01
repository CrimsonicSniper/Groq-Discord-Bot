const { SlashCommandBuilder, ChannelType } = require('discord.js')
const { handleClockOutCommand } = require('./tools/clockcommands')
module.exports = {
    data: new SlashCommandBuilder()
    .setName('clockout')
    .setDescription('Clock out to record your time.'),
    async execute(interaction) {
        handleClockOutCommand(interaction)
    }
}