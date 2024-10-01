
let talkCollector = null;
const serverMessages = {};
const {getGroqChatCompletionContinous} = require('./getGroqChatCompletion')
const {splitMessage} = require('./splitMessages')
async function handleTalkCommand(interaction) {
    await interaction.reply('Talking mode is active. Type messages to chat or use `/exit` to stop.');
  
    talkCollector = await interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id });
  
    talkCollector.on('collect', async m => {
      if (m.content.toLowerCase() === '!exittalk') {
        await interaction.channel.send('Exiting talk mode.');
        talkCollector.stop();
      } else {
        const talkContext = serverMessages[interaction.guild.id] || [];
        talkContext.push({ role: 'user', content: m.content });
        const chatCompletion = await getGroqChatCompletionContinous(talkContext);
        talkContext.push({ role: 'assistant', content: chatCompletion });
  
        const responseParts = splitMessage(chatCompletion);
        for (let i = 0; i < responseParts.length; i++) {
          await interaction.channel.send(responseParts[i]);
        }
  
        serverMessages[interaction.guild.id] = talkContext;
      }
    });
  
    talkCollector.on('end', (collected, reason) => {
      interaction.channel.send('Talk collector stopped.');
    });
  }
  
  async function handleExitCommand(interaction) {
    await interaction.reply('Exiting talk mode.');
    if (talkCollector) {
      talkCollector.stop();
      talkCollector = null;
    }
  }
module.exports = { handleExitCommand, handleTalkCommand};