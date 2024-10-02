const { SlashCommandBuilder } = require('discord.js')
const { getGroqChatCompletionContinous } = require('./tools/getGroqChatCompletion')
let talkCollector = null;
const serverMessages = {};
const { splitMessage } = require('./tools/splitMessages')
const {handleTalkCommand} = require('./tools/talkandexit')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('talk')
    .setDescription(`Activates a session with the bot like character.ai`),
    async execute(interaction) {
      handleTalkCommand(interaction)
    }
}
