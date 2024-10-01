const { SlashCommandBuilder } = require('discord.js')
const { getGroqChatCompletion } = require('./tools/getGroqChatCompletion')
const { splitMessage } = require('./tools/splitMessages')
module.exports = {
    data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription(`Use GROQ to ask a AI bot`)
    .addStringOption(option =>
        option.setName('query')
          .setDescription('Your question.')
          .setRequired(true)
      ),
    async execute(interaction) {
  
    const query = interaction.options.getString('query');
    const answer = await getGroqChatCompletion([{ role: 'user', content: query }]);
    const processedChunks = splitMessage(answer);
  
    await interaction.reply(processedChunks[0]);
    for (let i = 1; i < processedChunks.length; i++) {
      await interaction.channel.send(processedChunks[i]);
    }
  
        
    }
}