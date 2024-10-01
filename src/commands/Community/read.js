const { SlashCommandBuilder } = require('discord.js')
const { getGroqChatCompletion } = require('./tools/getGroqChatCompletion')
const { splitMessage } = require('./tools/splitMessages')
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
        const messageContents = "Summarize these messages form a discord chat & make it medium sized (3000 letters according to size, you can also type more than 3000 letters if the input is big.): " + messages.map(msg => msg.content).join('\n');
        const summary = await getGroqChatCompletion([{ role: 'user', content: messageContents }]);
        const splitsummary = splitMessage(summary);
        await interaction.reply(splitsummary[0]);
        for (let i = 1; i < splitsummary.length; i++) {
          await interaction.channel.send(splitsummary[i]);
        }
    }
}