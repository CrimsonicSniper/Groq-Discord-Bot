
let talkCollector = null;
const serverMessages = {};
const {getGroqChatCompletionContinous} = require('./getGroqChatCompletion')
const {splitMessage} = require('./splitMessages')
const {sendEmbed} = require('./embedbuilder')
async function handleTalkCommand(interaction) {
  await interaction.reply('.');
  await sendEmbed(interaction, { title: `Talking Mode Active`, description: 'Talking mode is active. Type messages to chat or use `/exit` to stop.', noReply: true});
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
          await sendEmbed(interaction, { title: `Reply`, description: responseParts[i], noReply: true});
        }
        serverMessages[interaction.guild.id] = talkContext;
      }
    });
  
    talkCollector.on('end', (collected, reason) => {
      sendEmbed(interaction, { title: `Talk Collector Stopped`, description: 'Talk Collector has been stopped, this means that the bot will not reply to every message that the user sends.', noReply: true});
    });
  }
  
  async function handleExitCommand(interaction) {
    await interaction.reply('.');
    await sendEmbed(interaction, { title: `Talking Mode Deactivated`, description: 'Talking mode has been deactivated.. Please wait for Talk Collector to stop.', noReply: true});
    if (talkCollector) {
      talkCollector.stop();
      talkCollector = null;
    }
  }
async function handleApexifyTalk(interaction) {

}
module.exports = { handleExitCommand, handleTalkCommand};