const { SlashCommandBuilder, ChannelType, REST, Routes } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('talk')
    .setDescription('Enter talking mode.'),
  new SlashCommandBuilder()
    .setName('exit')
    .setDescription('Exit talking mode.'),
  new SlashCommandBuilder()
    .setName('read')
    .setDescription('Read and summarize messages from a channel.')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of messages to read.')
        .setRequired(true)
        .setMinValue(1) // MIN
        .setMaxValue(100) // MAX
    ),
  new SlashCommandBuilder()
    .setName('reboot')
    .setDescription('Reboot the bot and clear memory.'),
  new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to blacklist.')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup the channel ID for clock-in and clock-out logs.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where clock-in and clock-out logs will be posted.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a question to the bot.')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Your question.')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('clockin')
    .setDescription('Clock in to record your time.'),
  new SlashCommandBuilder()
    .setName('clockout')
    .setDescription('Clock out to record your time.'),
  new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Generate an image based on a prompt.')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('The prompt for the image generation.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('resolution')
        .setDescription('The resolution of the image.')
        .setRequired(false)
        .addChoices(
          { name: 'Landscape', value: 'landscape' },
          { name: 'Portrait', value: 'portrait' },
          { name: 'Square', value: 'square' }
        )
    )
].map(command => command.toJSON());

async function registerCommands(id, token) {
  const rest = new REST().setToken(token);
  try {
    await rest.put(
      Routes.applicationCommands(id),
      { body: commands }
    );
    console.log('Reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

module.exports = { registerCommands };