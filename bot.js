require('dotenv').config();  // Load environment variables from .env file

const { Client, GatewayIntentBits, MessageActionRow, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// Initialize Groq with API key from environment variables
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

if (!process.env.GROQ_API_KEY) {
    console.error("GROQ API KEY environment variable is missing or empty. Please set it in the .env file.");
    process.exit(1); // Exit process with error code
}

// Discord bot token
const TOKEN = process.env.DISCORD_BOT_TOKEN;

// Initialize Discord Client with intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const maxMessages = 8948; // Maximum messages to remember per server
const maxLogSize = 256 * 1024 * 1024; // 256 MB
const serverMessages = {};
const logsFilePath = path.join(__dirname, 'logs.json');

// Load logs.json if it exists
let logs = {};
if (fs.existsSync(logsFilePath)) {
    logs = JSON.parse(fs.readFileSync(logsFilePath, 'utf8'));
}

// Function to store messages per server
function rememberMessage(serverId, role, content) {
    if (!serverMessages[serverId]) {
        serverMessages[serverId] = [];
    }
    serverMessages[serverId].push({ role, content });

    if (serverMessages[serverId].length > maxMessages) {
        serverMessages[serverId].shift(); // Remove the oldest message
    }
}

client.once('ready', () => {

  console.log('Bot is online!');

});

// Function to store key information in logs.json
async function storeKeyInformation(serverId, content) {
    try {
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: `Is the following information key? ${content}` }],
            model: 'llama3-8b-8192',
        });

        const isKey = response.choices[0]?.message?.content.toLowerCase().includes('yes');
        
        if (isKey) {
            if (!logs[serverId]) {
                logs[serverId] = [];
            }
            logs[serverId].push({ timestamp: new Date().toISOString(), keyInfo: content });

            // Write logs to logs.json
            fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2), 'utf8');

            // Check if log file size exceeds the limit
            const stats = fs.statSync(logsFilePath);
            return stats.size > maxLogSize;
        }
        return false;
    } catch (error) {
        console.error("Groq API Error:", error);
        return false;
    }
}

// Function to get chat completion from Groq API with context preservation
async function getGroqChatCompletion(context) {
    try {
        const response = await groq.chat.completions.create({
            messages: context,
            model: 'llama3-8b-8192',
        });
        return response.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (error) {
        console.error("Groq API Error:", error);
        return "Sorry, I couldn't process your request.";
    }
}

// Command to reboot the bot
client.on('messageCreate', async message => {
    if (message.content === '!reboot') {
        const serverId = message.guild.id;
        const serverLogs = logs[serverId] || [];

        let keyInfoMessage = "Key information before reboot:\n";
        if (serverLogs.length === 0) {
            keyInfoMessage += "No key information stored.";
        } else {
            keyInfoMessage += serverLogs.map(log => {
                const timestamp = log.timestamp || "No timestamp";
                const keyInfo = log.keyInfo || "No key information";
                return `${timestamp}: ${keyInfo}`;
            }).join('\n');
        }

        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_reboot')
            .setLabel('Confirm Reboot')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_reboot')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await message.channel.send({
            content: keyInfoMessage + "\n\nDo you want to reboot the bot? (Click 'Confirm Reboot' to proceed.)",
            components: [row]
        });

        const filter = interaction => ['confirm_reboot', 'cancel_reboot'].includes(interaction.customId) && interaction.user.id === message.author.id;
        const collector = message.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async interaction => {
            if (interaction.customId === 'confirm_reboot') {
                await interaction.update({
                    content: "Rebooting...",
                    components: []
                });

                serverMessages[serverId] = []; // Clear memory for the server

                const updatedLogs = logs.filter(log => log.serverId !== serverId);
                fs.writeFileSync(logsFilePath, JSON.stringify(updatedLogs, null, 2));

                await interaction.followUp({
                    content: "Bot has been rebooted and memory has been cleared.",
                });
            } else {
                await interaction.update({
                    content: "Reboot cancelled.",
                    components: []
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                message.channel.send("Reboot confirmation timed out.");
            }
        });

        return;
    }

    // Detect and store key information
    if (message.content.toLowerCase().includes('your name is')) {
        const name = message.content.split('your name is')[1].trim();
        const response = `Nice to meet you! I'm ${name}, nice and simple, just a humble AI assistant. What can I help you with today?`;

        rememberMessage(message.guild.id, 'user', message.content);
        rememberMessage(message.guild.id, 'assistant', response);

        const needsNotification = await storeKeyInformation(message.guild.id, `Bot name set to ${name}.`);

        if (needsNotification) {
            await message.channel.send("Key information stored. Please note that the log file size limit has been exceeded.");
        } else {
            await message.channel.send(response);
        }
        return;
    }

    // Handle !talk command
    if (message.content === '!talk') {
        await message.channel.send('Talking mode is active. To exit, type !exittalk.');

        const serverId = message.guild.id;
        let talkContext = serverMessages[serverId] || [];

        const talkCollector = message.channel.createMessageCollector({ filter: m => m.author.id === message.author.id });

        talkCollector.on('collect', async m => {
            if (m.content === '!exittalk') {
                await message.channel.send('Exiting talk mode.');
                talkCollector.stop();
            } else {
                talkContext.push({ role: 'user', content: m.content });
                const chatCompletion = await getGroqChatCompletion(talkContext);
                talkContext.push({ role: 'assistant', content: chatCompletion });
                await message.channel.send(chatCompletion);
            }
        });

        return;
    }
});

// Log in to Discord with the bot token
client.login(TOKEN);
