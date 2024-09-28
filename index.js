// Huge thanks to @catalyst.pq on discord for helping out in many commands
// made by deadlyspace_ and catalyst.pq

// <=====[ Imports ]=====>
const { Client, GatewayIntentBits, ChannelType, REST, Routes, SlashCommandBuilder, Collection, MessageActionRow, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const setupFilePath = './setup.json';
const Groq = require('groq-sdk');
const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');
require('dotenv').config();

const { registerCommands } = require('./commands');
const webpageHandling = require('./tools/webpageHandling');
const { splitMessage } = require('./tools/splitMessages');
const { generateImg, retryOperation } = require('./tools/gen_img');

// <=====[ Webpage Handling ]=====>

const app = express();
const PORT = process.env.PORT || 9442;

app.use(express.static('dist'));

app.use(webpageHandling);

app.listen(PORT, () => {
  console.log(`Server is running on http://deka.pylex.xyz:${PORT}. Available URL's are /login.`);
});

// <=====>

// <=====[ Initialising Environments ]=====>

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const client = new Client({
  intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
  disableMentions: 'everyone',
});

client.on('ready', async () => {
  await registerCommands(client.user.id, TOKEN);
});

// Max messages and log size settings
const maxMessages = 30; // Number of messages to remember per server
const maxLogSize = 25 * 1024 * 1024;
const webhookUrl = process.env.WEBHOOK_URL;

let setup = {};

const clockLogsFilePath = './Clock-Logs.json';
if (fs.existsSync(setupFilePath)) {
  setup = JSON.parse(fs.readFileSync(setupFilePath, 'utf8'));
}
let logs = {};
const logsFilePath = path.join(__dirname, 'logs.json');
if (fs.existsSync(logsFilePath)) {
  logs = JSON.parse(fs.readFileSync(logsFilePath, 'utf8'));
}

// <=====[ Webhook Logging ]=====>

const messageQueue = [];
let isRateLimited = false;

async function sendToWebhook(content) {
  messageQueue.push(content);
}

function postToWebhook(content) {
  const data = JSON.stringify({ content });
  const url = new URL(webhookUrl);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    if (res.statusCode === 429) {
      isRateLimited = true;
      const retryAfter = parseInt(res.headers['retry-after'], 10) * 1000 || 1000;

      console.error('Rate limited. Retrying after', retryAfter, 'ms');
      setTimeout(() => { isRateLimited = false; }, retryAfter);
    } else if (res.statusCode < 200 || res.statusCode >= 300) {
      console.error('Failed to send message:', res.statusCode);
    }
  });

  req.on('error', console.error);
  req.write(data);
  req.end();
}

setInterval(() => {
  if (messageQueue.length && !isRateLimited) {
    postToWebhook(messageQueue.shift());
  }
}, 1000);

console.log = (...args) => {
  const message = args.join(' ');
  sendToWebhook(message);
  process.stdout.write(message + '\n');
};

// <=====>

async function getGroqChatCompletion(context) {
  try {
    const filteredContext = context.filter(message => message.content && message.content.trim() !== '');

    const response = await groq.chat.completions.create({
      messages: filteredContext,
      model: 'llama3-8b-8192',
    });

    return response.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    console.error("Groq API Error:", error);
    return "Sorry, I couldn't process your request.";
  }
}

let talkCollector = null;
const serverMessages = {};

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'talk':
        await handleTalkCommand(interaction);
        break;
      case 'exit':
        await handleExitCommand(interaction);
        break;
      case 'setup':
        await handleSetupCommand(interaction);
        break;
      case 'clockin':
        await handleClockInCommand(interaction);
        break;
      case 'clockout':
        await handleClockOutCommand(interaction);
        break;
      case 'read':
        await handleReadCommand(interaction);
        break;
      case 'reboot':
        await handleRebootCommand(interaction);
        break;
      case 'blacklist':
        await handleBlacklistCommand(interaction);
        break;
      case 'ask':
        await handleAskCommand(interaction);
        break;
      case 'imagine':
        await handleImagineCommand(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
        break;
    }
  } catch (error) {
    console.error('Error handling command:', error);
  }
});

async function handleImagineCommand(interaction) {
  const prompt = interaction.options.getString('prompt');
  const resolution = interaction.options.getString('resolution') || 'square';

  try {
    await interaction.reply({ content: 'Generating your image, please wait...' });

    const imageUrl = await retryOperation(() => generateImg(prompt, resolution), 3);

    await interaction.channel.send({ 
      content: `<@${interaction.user.id}>, Here is your generated image:`, 
      files: [imageUrl]
    });
  } catch (error) {
    console.error('Error generating image:', error);
    await interaction.channel.send({ content: 'There was an error generating your image. Please try again later.' });
  }
}

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
      const chatCompletion = await getGroqChatCompletion(talkContext);
      talkContext.push({ role: 'assistant', content: chatCompletion });

      const responseParts = splitMessage(chatCompletion);
      for (let i = 0; i < responseParts.length; i++) {
        await interaction.channel.send(responseParts[i]);
      }

      serverMessages[interaction.guild.id] = talkContext;
    }
  });

  talkCollector.on('end', (collected, reason) => {
    console.log(`Collector stopped due to: ${reason}`);
  });
}

async function handleExitCommand(interaction) {
  await interaction.reply('Exiting talk mode.');
  if (talkCollector) {
    talkCollector.stop();
    talkCollector = null;
  }
}

async function handleSetupCommand(interaction) {
  const inputChannel = interaction.options.getChannel('channel');

  if (!inputChannel || inputChannel.type !== ChannelType.GuildText) {
    return await interaction.reply({ content: 'Please provide a valid text channel.', ephemeral: true });
  }

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
  }

  setup[interaction.guild.id] = {
    channelId: inputChannel.id
  };

  try {
    fs.writeFileSync(setupFilePath, JSON.stringify(setup, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write setup file:', error);
    return await interaction.reply({ content: 'Failed to save setup data.', ephemeral: true });
  }

  await interaction.reply({ content: `Channel ${inputChannel.name} has been set up for clock-in and clock-out logs.`, ephemeral: true });
}

async function handleClockInCommand(interaction) {
  const clockInConfig = setup[interaction.guild.id];
  if (!clockInConfig || !clockInConfig.channelId) {
    return await interaction.reply('No channel has been set up for clock-in and clock-out logs. Please use the /setup command first.');
  }

  const clockInChannel = interaction.guild.channels.cache.get(clockInConfig.channelId);
  if (!clockInChannel || clockInChannel.type !== ChannelType.GuildText) {
    return await interaction.reply('The setup channel is not valid. Please use the /setup command to configure a valid channel.');
  }

  const clockInTimestamp = Math.floor(Date.now() / 1000);
  const memberName = interaction.member.user.tag;

  const logData = {
    userId: interaction.member.id,
    userName: memberName,
    timestamp: clockInTimestamp
  };

  let clockLogs = [];
  if (fs.existsSync(clockLogsFilePath)) {
    clockLogs = JSON.parse(fs.readFileSync(clockLogsFilePath, 'utf8'));
  }

  clockLogs.push({ event: 'clockin', ...logData });
  fs.writeFileSync(clockLogsFilePath, JSON.stringify(clockLogs, null, 2), 'utf8');

  await clockInChannel.send(`${memberName} has clocked in at <t:${clockInTimestamp}:F>.`);
  await interaction.reply(`Clock-in recorded at <t:${clockInTimestamp}:F>.`);
}

async function handleClockOutCommand(interaction) {
  const clockOutConfig = setup[interaction.guild.id];
  if (!clockOutConfig || !clockOutConfig.channelId) {
    return await interaction.reply('No channel has been set up for clock-in and clock-out logs. Please use the /setup command first.');
  }

  const clockOutChannel = interaction.guild.channels.cache.get(clockOutConfig.channelId);
  if (!clockOutChannel || clockOutChannel.type !== ChannelType.GuildText) {
    return await interaction.reply('The setup channel is not valid. Please use the /setup command to configure a valid channel.');
  }

  const clockOutTimestamp = Math.floor(Date.now() / 1000);
  const memberNameClockOut = interaction.member.user.tag;

  const logOutData = {
    userId: interaction.member.id,
    userName: memberNameClockOut,
    timestamp: clockOutTimestamp
  };

  let clockLogsOut = [];
  if (fs.existsSync(clockLogsFilePath)) {
    clockLogsOut = JSON.parse(fs.readFileSync(clockLogsFilePath, 'utf8'));
  }

  clockLogsOut.push({ event: 'clockout', ...logOutData });
  fs.writeFileSync(clockLogsFilePath, JSON.stringify(clockLogsOut, null, 2), 'utf8');

  await clockOutChannel.send(`${memberNameClockOut} has clocked out at <t:${clockOutTimestamp}:F>.`);
  await interaction.reply(`Clock-out recorded at <t:${clockOutTimestamp}:F>.`);
}

async function handleReadCommand(interaction) {
  const count = interaction.options.getInteger('count');
  const messages = await interaction.channel.messages.fetch({ limit: count });
  const messageContents = messages.map(msg => msg.content).join('\n');
  const summary = await getGroqChatCompletion([{ role: 'user', content: messageContents }]);
  const splitsummary = splitMessage(summary);

  await interaction.reply(splitsummary[0]);
  for (let i = 1; i < splitsummary.length; i++) {
    await interaction.channel.send(splitsummary[i]);
  }
}

async function handleRebootCommand(interaction) {
  let rebootKeyInfoMessage = "Key information before reboot:\n";
  if (logs[interaction.guild.id] && logs[interaction.guild.id].length > 0) {
    rebootKeyInfoMessage += logs[interaction.guild.id].map(log => {
      const timestamp = log.timestamp || "No timestamp";
      const keyInfo = log.keyInfo || "No key information";
      return `${timestamp}: ${keyInfo}`;
    }).join('\n');
  } else {
    rebootKeyInfoMessage = "No key information stored.";
  }

  const rebootConfirmButton = new ButtonBuilder()
    .setCustomId('confirm_reboot')
    .setLabel('Confirm Reboot')
    .setStyle(ButtonStyle.Danger);

  const rebootCancelButton = new ButtonBuilder()
    .setCustomId('cancel_reboot')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const rebootRow = new ActionRowBuilder().addComponents(
    rebootConfirmButton,
    rebootCancelButton
  );

  await interaction.reply({
    content: rebootKeyInfoMessage,
    components: [rebootRow]
  });

  const filter = i => i.customId === 'confirm_reboot' || i.customId === 'cancel_reboot';
  const collector = await interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

  collector.on('collect', async i => {
    if (i.customId === 'confirm_reboot') {
      await i.update({ content: 'Bot is rebooting...', components: [] });
      setTimeout(() => process.exit(), 1000);
    } else if (i.customId === 'cancel_reboot') {
      await i.update({ content: 'Reboot cancelled.', components: [] });
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      interaction.channel.send('Reboot confirmation timed out.');
    }
  });
}

async function handleBlacklistCommand(interaction) {
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

async function handleAskCommand(interaction) {
  const query = interaction.options.getString('query');
  const answer = await getGroqChatCompletion([{ role: 'user', content: query }]);
  const processedChunks = splitMessage(answer);

  await interaction.reply(processedChunks[0]);
  for (let i = 1; i < processedChunks.length; i++) {
    await interaction.channel.send(processedChunks[i]);
  }
}

client.login(TOKEN);