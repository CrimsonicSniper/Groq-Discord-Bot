const { generateImg, retryOperation } = require('./tools/gen_img');
const { SlashCommandBuilder } = require('discord.js')
module.exports = {
    data: new SlashCommandBuilder()
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
    ),
    async execute(interaction) {
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
}

