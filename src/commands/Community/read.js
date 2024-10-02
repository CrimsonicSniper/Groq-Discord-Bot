const { SlashCommandBuilder } = require('discord.js')
const { getGroqChatCompletionContinous} = require('./tools/getGroqChatCompletion')
const { splitMessage } = require('./tools/splitMessages')
const {sendEmbed} = require('./tools/embedbuilder')
module.exports = {
    data:  new SlashCommandBuilder()
    .setName('read')
    .setDescription('Read and summarize messages from a channel.')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of messages to read.')
        .setRequired(true)
        .setMinValue(1) // MIN
        .setMaxValue(100) // MAX
    ),
    async execute(interaction) {
        const count = interaction.options.getInteger('count');
        const messages = await interaction.channel.messages.fetch({ limit: count });
        const messageContents = "These messages are from a discord chat: Summarize and tell the context of the chat: " + messages.map(msg => msg.content).join('\n');
        const summary = await getGroqChatCompletionContinous([{ role: 'user', content: messageContents }]);
        const processedChunks = splitMessage(summary);
  
        await sendEmbed(interaction, { title: `/read, Response: 1`, description: processedChunks[0]});
        for (let i = 1; i < processedChunks.length; i++) {
          await sendEmbed(interaction, { title: `/read, Response: ${i + 1}`, description: processedChunks[i], noReply: true});
        }
    }
}