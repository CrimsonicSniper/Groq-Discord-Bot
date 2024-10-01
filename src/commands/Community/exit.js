const { SlashCommandBuilder } = require('discord.js')
const { getGroqChatCompletion } = require('./tools/getGroqChatCompletion')
const { splitMessage } = require('./tools/splitMessages')
const { handleExitCommand } = require('./tools/talkandexit')
module.exports = {
    data: new SlashCommandBuilder()
    .setName('exit')
    .setDescription('Exit talking mode.'),
    async execute(interaction) {
        handleExitCommand(interaction)
    }
}