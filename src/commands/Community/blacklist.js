const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js')
const { getGroqChatCompletion } = require('./tools/getGroqChatCompletion')
const { splitMessage } = require('./tools/splitMessages')
module.exports = {
    data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to blacklist.')
        .setRequired(true)
    ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');

        const blacklistConfirmButton = new ButtonBuilder()
          .setCustomId('blacklist_yes')
          .setLabel('Yes')
          .setStyle(ButtonStyle.Danger);
      
        const blacklistCancelButton = new ButtonBuilder()
          .setCustomId('blacklist_no')
          .setLabel('No')
          .setStyle(ButtonStyle.Success);
      
        const blacklistRow = new ActionRowBuilder().addComponents(
          blacklistConfirmButton,
          blacklistCancelButton
        );
      
        await interaction.reply({
          content: `Do you really want to blacklist ${targetUser.tag}?`,
          components: [blacklistRow]
        });
      
        const blacklistFilter = i => i.customId === 'blacklist_yes' || i.customId === 'blacklist_no';
        const blacklistCollector = await interaction.channel.createMessageComponentCollector({ blacklistFilter, time: 15000 });
      
        blacklistCollector.on('collect', async i => {
          if (i.customId === 'blacklist_yes') {
            await i.update({ content: `${targetUser.tag} has been blacklisted.`, components: [] });
            try {
              await interaction.guild.members.ban(targetUser.id);
            } catch (error) {
              console.log(`Unable To Ban The Blacklisted User: ${error.message}`)
            }
          } else if (i.customId === 'blacklist_no') {
            await i.update({ content: 'Blacklist action canceled.', components: [] });
          }
        });
      
        blacklistCollector.on('end', collected => {
          if (collected.size === 0) {
            interaction.channel.send('Blacklist confirmation timed out.');
          }
        });
    }
}