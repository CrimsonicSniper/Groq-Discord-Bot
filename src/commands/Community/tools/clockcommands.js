const {ChannelType, PermissionsBitField} = require('discord.js')
const fs = require('fs')
let setup = {};
const setupFilePath = './setup.json';
const path = require('path')

const clockLogsFilePath = './Clock-Logs.json';
if (fs.existsSync(setupFilePath)) {
  setup = JSON.parse(fs.readFileSync(setupFilePath, 'utf8'));
}
let logs = {};
const logsFilePath = path.join(__dirname, 'logs.json');
if (fs.existsSync(logsFilePath)) {
  logs = JSON.parse(fs.readFileSync(logsFilePath, 'utf8'));
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
module.exports = {handleClockInCommand, handleSetupCommand, handleClockOutCommand}