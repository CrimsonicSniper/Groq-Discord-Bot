const { SlashCommandBuilder } = require('discord.js')
const { getGroqChatCompletion } = require('./tools/getGroqChatCompletion')
const { splitMessage } = require('./tools/splitMessages')
const { sendEmbed } = require('./tools/embedbuilder')
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
  
    await sendEmbed(interaction, { title: `Message: 1`, description: processedChunks[0]});
    for (let i = 1; i < processedChunks.length; i++) {
      await sendEmbed(interaction, { title: `Message: ${i + 1}`, description: processedChunks[i], noReply: true});
    }

  
        
    }
}