const { SlashCommandBuilder, ChannelType } = require('discord.js')
const { handleSetupCommand } = require('./tools/clockcommands')
module.exports = {
    data:   new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup the channel ID for clock-in and clock-out logs.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where clock-in and clock-out logs will be posted.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),
    async execute(interaction) {
        handleSetupCommand(interaction)
    }
}