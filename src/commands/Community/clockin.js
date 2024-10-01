const { SlashCommandBuilder, ChannelType } = require('discord.js')
const { handleClockInCommand } = require('./tools/clockcommands')
module.exports = {
    data: new SlashCommandBuilder()
    .setName('clockin')
    .setDescription('Clock in to record your time.'),
    async execute(interaction) {
        handleClockInCommand(interaction)
    }
}