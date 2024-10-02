const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const url = require('url');

const hexColour = '#505050'; // You can change this to any color you prefer
const errorHexColour = '#e74c3c'; // Color for error embeds
const fallbackIconURL = 'https://ai.google.dev/static/site-assets/images/share.png';
const fallbackText = 'Bot Template • Catalyst';

function truncate(str, maxLength) {
  return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
}
const generateRandom = () => (Math.random().toString(36).slice(2, 5));

async function sendEmbed(entity, embed, ephemeral = false) {
  const { title, description, imageUrl, noReply, files, dm } = embed;
  const { guild } = entity;
  const user = entity.user || entity.author;

  const truncatedAuthorName = truncate(`To ${user.username} - ${title}`, 256);
  const truncatedDescription = truncate(description, 4096);
  const footerText = guild ? guild.name : fallbackText;
  const truncatedFooterText = truncate(footerText, 2048);

  const embedBuilder = new EmbedBuilder()
    .setColor(hexColour)
    .setDescription(truncatedDescription)
    .setAuthor({
      name: truncatedAuthorName,
      iconURL: user.displayAvatarURL()
    })
    .setFooter({
      text: truncatedFooterText,
      iconURL: guild ? (guild.iconURL() || fallbackIconURL) : fallbackIconURL
    });

  const options = {
    embeds: [embedBuilder],
    ephemeral: ephemeral,
    fetchReply: true
  };

  if (imageUrl || files) {
    options.files = [];
  
    if (imageUrl) {
      const parsedUrl = new URL(imageUrl);
      const imageExtension = path.extname(parsedUrl.pathname) || '.png';
      const imgName = `image-${generateRandom()}${imageExtension}`
      const attachment = new AttachmentBuilder(imageUrl, { name: imgName });
      embedBuilder.setImage(`attachment://${imgName}`)
      options.files.push(attachment);
    }
  
    if (files) {
      options.files.push(...files);
    }
  }

  let mainError = 'null';
  if (!noReply && !dm) {
    try {
      if (entity.reply) {
        const msg = await entity.reply(options);
        return msg;
      }
    } catch (error) {
      mainError = error.message;
      console.error(`Error replying to entity: ${error.message}`);
    }
  }
  
  if (dm) {
    try {
      const msg = await user.send(options);
      return msg;
    } catch (error) {
      mainError = error.message;
      console.error(`Error DMing to entity: ${error.message}`);
    }
  }

  if (!ephemeral && !dm) {
    try {
      if (entity.channel && entity.channel.send) {
        const msg = await entity.channel.send(options);
        return msg;
      }
    } catch (error) {
      mainError = error.message;
      console.error(`Error sending message to channel: ${error.message}`);
    }
  }

  return await sendErrorDM(entity, mainError);
}

async function sendErrorDM(entity, errorMessage) {
  const { guild } = entity;
  const user = entity.user || entity.author;

  const dmEmbed = new EmbedBuilder()
    .setColor(errorHexColour)
    .setDescription(truncate(`Something seems off. An error occurred:\n\`\`\`${errorMessage}\`\`\``, 4096))
    .setAuthor({
      name: `Error Notification`,
      iconURL: user.displayAvatarURL()
    })
    .setFooter({
      text: guild ? truncate(guild.name, 2048) : fallbackText,
      iconURL: guild ? (guild.iconURL() || fallbackIconURL) : fallbackIconURL
    });

  try {
    await user.send({ embeds: [dmEmbed] });
    return null;
  } catch (dmError) {
    console.error(`Error sending DM to user: ${dmError.message}`);
    return null;
  }
}

async function editEmbed(botMessage, newEmbed, interaction) {
  const { title, description, imageUrl, files } = newEmbed;
  if (!botMessage.embeds || botMessage.embeds.length === 0) {
    return botMessage;
  }

  const embed = botMessage.embeds[0];
  const updatedEmbed = new EmbedBuilder(embed)
    .setAuthor({
      name: interaction ? truncate(`To ${interaction.user.username} - ${title}`, 256) : truncate(`${embed.author.name.split(' - ')[0]} - ${title}`, 256),
      iconURL: interaction ? interaction.user.displayAvatarURL() : embed.author.iconURL
    })
    .setDescription(truncate(description || embed.description, 4096));

  const options = {
    embeds: [updatedEmbed],
    fetchReply: true
  };

  const existingAttachments = botMessage.attachments.map(attachment => ({
    attachment: attachment.url
  }));

  if (imageUrl || files) {
    const existingAttachments = (botMessage.attachments || [])
      .filter(attachment => !(attachment.name.startsWith('image-') && imageUrl))
      .map(attachment => ({
        attachment: attachment.url
      }));
    options.files = existingAttachments;

    if (imageUrl) {
      const parsedUrl = new URL(imageUrl);
      const imageExtension = path.extname(parsedUrl.pathname) || '.png';
      const imgName = `image-${generateRandom()}${imageExtension}`
      const attachment = new AttachmentBuilder(imageUrl, { name: imgName });
      embedBuilder.setImage(`attachment://${imgName}`)
      options.files.push(attachment);
    }

    if (files) {
      options.files.push(...files);
    }
  } else {
    options.files = existingAttachments;
  }

  try {
    if (interaction) {
      const msg = await interaction.editReply(options);
      return msg;
    } else {
      const msg = await botMessage.edit(options);
      return msg;
    }
  } catch (error) {
    const errorMsg = `Error editing embed message: ${error.message}`;
    console.error(errorMsg);
    if (interaction) {
      await sendErrorDM(interaction, errorMsg);
    }
    return botMessage;
  }
}

module.exports = { sendEmbed, sendErrorDM, editEmbed };