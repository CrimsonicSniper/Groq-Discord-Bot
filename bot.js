/* NOTE: OLD CODE, USE THIS IF IT DOESNT WORK.
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

// Function to determine if content is key information
function isKeyInformation(content) {
    // Define keywords or phrases that are indicative of key information
    const keyPhrases = [
        "name", "introduce", "about", "who am i", "my name", "i am", "character", "identity"
    ];

    // Check if content contains any of the key phrases
    return keyPhrases.some(phrase => content.toLowerCase().includes(phrase));
}

// Function to store key information in logs.json
async function storeKeyInformation(serverId, content) {
    try {
        const isKey = isKeyInformation(content);
        
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

        // Collect and display key information for the server
        let keyInfoMessage = "Key information before reboot:\n";
        if (logs[serverId] && logs[serverId].length > 0) {
            keyInfoMessage += logs[serverId].map(log => {
                const timestamp = log.timestamp || "No timestamp";
                const keyInfo = log.keyInfo || "No key information";
                return `${timestamp}: ${keyInfo}`;
            }).join('\n');
        } else {
            keyInfoMessage += "No key information stored.";
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

                // Clear memory for the server
                serverMessages[serverId] = [];

                // Clear key information from logs
                delete logs[serverId];
                fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2));

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

    // Example command to get response from Groq
    if (message.content.startsWith('!ask')) {
        const userQuery = message.content.slice(5); // Extract user query after "!ask "

        rememberMessage(message.guild.id, 'user', userQuery);
        const response = await getGroqChatCompletion([{ role: 'user', content: userQuery }]);

        rememberMessage(message.guild.id, 'assistant', response);
        const needsNotification = await storeKeyInformation(message.guild.id, userQuery);

        if (needsNotification) {
            await message.channel.send("Key information stored. Please note that the log file size limit has been exceeded.");
        } else {
            await message.channel.send(response);
        }
        return;
    }
});

// Log in to Discord with the bot token
client.login(TOKEN);
*/

// Required imports and initial setup
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Collection, MessageActionRow, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const Groq = require('groq-sdk');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config(); // To use environment variables from a .env file

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 9442;

// Middleware for Express
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('dist')); // Serve static files from the 'dist' directory

// Express routes for login and dashboard
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Validate credentials
    if (username === process.env.USERNAME && password === process.env.PASSWORD) {
        res.redirect('/dashboard'); // Successful login
    } else {
        res.status(401).send('Invalid credentials'); // Unauthorized response (Does not work.)
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dist/index.html')); //PUT YOUR HTML FILE HERE.
});

app.use('/css', express.static(path.join(__dirname, 'public', 'dist')));
 // ADD YOUR CSS FILES TO /CSS AND WHEN YOU WANT TO IMPORT STYLESHEET USE /CSS INSTEAD OF THE PATH
app.use('/css', express.static(path.join(__dirname, 'public', 'src')));

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dist/dashboard.html'));
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Initialize Groq with API key from environment variables
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Discord bot token
const TOKEN = process.env.DISCORD_BOT_TOKEN;

// Initialize Discord client with intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Initialize commands collection
client.commands = new Collection();

// Define slash commands
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
        .setName('ask')
        .setDescription('Ask a question to the bot.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Your question.')
                .setRequired(true)
        )
].map(command => command.toJSON());

// Register slash commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Max messages and log size settings
const maxMessages = 30; // Number of messages to remember per server
const maxLogSize = 256 * 1024 * 1024; // 256 MB
const serverMessages = {};
const logsFilePath = path.join(__dirname, 'logs.json');

// Load logs.json if it exists
let logs = {};
if (fs.existsSync(logsFilePath)) {
    logs = JSON.parse(fs.readFileSync(logsFilePath, 'utf8'));
}

// Helper functions for message handling and log management
function rememberMessage(serverId, role, content) {
    if (!serverMessages[serverId]) {
        serverMessages[serverId] = [];
    }
    serverMessages[serverId].push({ role, content });

    if (serverMessages[serverId].length > maxMessages) {
        serverMessages[serverId].shift(); // Remove the oldest message
    }
}

function isKeyInformation(content) {
    const keyPhrases = [
    "date", "time", "location", "name", "age", "address", "email", "phone number",
    "appointment", "event", "meeting", "deadline", "birthday", "anniversary",
    "reminder", "schedule", "username", "password", "website", "company name",
    "job title", "department", "project", "task", "milestone", "delivery", "budget",
    "invoice", "payment", "contract", "agreement", "signature", "confirmation",
    "approval", "rejection", "feedback", "comment", "question", "inquiry", "request",
    "submission", "application", "form", "document", "file", "attachment", "link",
    "URL", "website", "browser", "login", "authentication", "security", "access",
    "permission", "role", "status", "update", "progress", "report", "result",
    "analysis", "data", "statistics", "metrics", "benchmark", "comparison", "trend",
    "forecast", "prediction", "plan", "strategy", "objective", "goal", "target",
    "priority", "risk", "issue", "problem", "solution", "action", "step", "procedure",
    "process", "method", "approach", "technique", "tool", "software", "application",
    "platform", "system", "network", "infrastructure", "database", "storage",
    "server", "cloud", "virtual", "backup", "recovery", "disaster", "business",
    "market", "industry", "sector", "customer", "client", "supplier", "vendor",
    "partner", "stakeholder", "team", "group", "individual", "employee", "manager",
    "supervisor", "director", "executive", "CEO", "CFO", "CTO", "board", "committee",
    "department", "division", "unit", "branch", "office", "site", "location",
    "facility", "headquarters", "region", "territory", "country", "city", "state",
    "province", "district", "zip code", "postal code", "coordinates", "latitude",
    "longitude", "map", "route", "direction", "distance", "time zone", "currency",
    "exchange rate", "budget", "cost", "expense", "revenue", "income", "profit",
    "loss", "margin", "balance", "credit", "debit", "loan", "interest", "rate",
    "tax", "deduction", "exemption", "fine", "penalty", "bonus", "commission",
    "salary", "wage", "payroll", "benefit", "insurance", "policy", "coverage",
    "claim", "premium", "settlement", "investment", "portfolio", "stock", "bond",
    "share", "equity", "dividend", "return", "yield", "growth", "inflation", "deflation",
    "recession", "recovery", "boom", "crisis", "risk", "opportunity", "challenge",
    "advantage", "disadvantage", "strength", "weakness", "threat", "safety", "security",
    "protection", "privacy", "compliance", "regulation", "law", "legal", "contract",
    "agreement", "settlement", "dispute", "litigation", "court", "trial", "judgment",
    "verdict", "sentence", "penalty", "fine", "appeal", "case", "evidence", "testimony",
    "witness", "jury", "lawyer", "attorney", "counsel", "judge", "courtroom",
    "hearing", "session", "proceeding", "decision", "order", "decree", "ruling",
    "injunction", "ban", "prohibition", "authorization", "permit", "license",
    "certification", "accreditation", "qualification", "training", "education",
    "course", "degree", "diploma", "certificate", "exam", "test", "quiz", "assignment",
    "homework", "project", "thesis", "dissertation", "research", "study", "experiment",
    "analysis", "survey", "questionnaire", "interview", "observation", "data",
    "statistics", "results", "findings", "conclusion", "recommendation", "solution"
    ];
    return keyPhrases.some(phrase => content.toLowerCase().includes(phrase));
}

async function storeKeyInformation(serverId, content) {
    try {
        const isKey = isKeyInformation(content);

        if (isKey) {
            if (!logs[serverId]) {
                logs[serverId] = [];
            }
            logs[serverId].push({ timestamp: new Date().toISOString(), keyInfo: content });

            fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2), 'utf8');

            const stats = fs.statSync(logsFilePath);
            return stats.size > maxLogSize;
        }
        return false;
    } catch (error) {
        console.error("Error storing key information:", error);
        return false;
    }
}

async function getGroqChatCompletion(context) {
    try {
        // Filter out messages where content is null or undefined
        const filteredContext = context.filter(message => message.content && message.content.trim() !== '');

        if (filteredContext.length === 0) {
            throw new Error("Context is empty or all messages are invalid.");
        }

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

function splitMessage(message, limit = 2000) {
    if (message.length <= limit) return [message];

    const parts = [];
    let index = 0;
    while (index < message.length) {
        let nextPart = message.slice(index, index + limit);
        const lastSpace = nextPart.lastIndexOf(' ');
        if (lastSpace > 0 && index + limit < message.length) {
            nextPart = message.slice(index, index + lastSpace);
            index += lastSpace + 1;
        } else {
            index += limit;
        }
        parts.push(nextPart);
    }
    return parts;
}

// Declare the collector variable at a scope level accessible to all relevant parts of the code
let talkCollector = null;

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    switch (commandName) {
        case 'talk':
            await interaction.reply('Talking mode is active. Type messages to chat or use `/exit` to stop.');

            // Create a new message collector for this interaction
            talkCollector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id });

            talkCollector.on('collect', async m => {
                console.log(`Message collected: ${m.content}`); // Debug: Show collected message

                if (m.content.toLowerCase() === '!exittalk') {
                    await interaction.channel.send('Exiting talk mode.');
                    talkCollector.stop(); // Stop the collector
                } else {
                    // Handle messages collected
                    const talkContext = serverMessages[interaction.guild.id] || [];
                    talkContext.push({ role: 'user', content: m.content });
                    const chatCompletion = await getGroqChatCompletion(talkContext);
                    talkContext.push({ role: 'assistant', content: chatCompletion });

                    const responseParts = splitMessage(chatCompletion);
                    for (const part of responseParts) {
                        await interaction.channel.send(part);
                    }

                    // Update the server messages
                    serverMessages[interaction.guild.id] = talkContext;
                }
            });

            talkCollector.on('end', (collected, reason) => {
                console.log(`Collector stopped due to: ${reason}`);
            });

            break;

        case 'exit':
            await interaction.reply('Exiting talk mode.');

            if (talkCollector) {
                talkCollector.stop(); // Ensure collector is stopped if it's active
                talkCollector = null; // Clear the reference
            }

            break;

        case 'read':
            const count = interaction.options.getInteger('count');
            const channel = interaction.channel;
            const messages = await channel.messages.fetch({ limit: count });
            const messageContents = messages.map(msg => msg.content).join('\n');
            const summary = await getGroqChatCompletion([{ role: 'user', content: messageContents }]);
            await interaction.reply(summary);
            break;

        case 'reboot':
            const rebootKeyInfoMessage = "Key information before reboot:\n";
            if (logs[interaction.guild.id] && logs[interaction.guild.id].length > 0) {
                rebootKeyInfoMessage += logs[interaction.guild.id].map(log => {
                    const timestamp = log.timestamp || "No timestamp";
                    const keyInfo = log.keyInfo || "No key information";
                    return `${timestamp}: ${keyInfo}`;
                }).join('\n');
            } else {
                let rebootKeyInfoMessage = "No key information stored.";
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
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

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
                    interaction.followUp('Reboot confirmation timed out.');
                }
            });
            break;

        case 'blacklist':
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
            const blacklistCollector = interaction.channel.createMessageComponentCollector({ blacklistFilter, time: 15000 });

            blacklistCollector.on('collect', async i => {
                if (i.customId === 'blacklist_yes') {
                    await i.update({ content: `${targetUser.tag} has been blacklisted.`, components: [] });
                    await interaction.guild.members.ban(targetUser.id);
                } else if (i.customId === 'blacklist_no') {
                    await i.update({ content: 'Blacklist action canceled.', components: [] });
                }
            });

            blacklistCollector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp('Blacklist confirmation timed out.');
                }
            });
            break;

        case 'ask':
            const query = interaction.options.getString('query');
            const answer = await getGroqChatCompletion([{ role: 'user', content: query }]);
            await interaction.reply(answer);
            break;

        default:
            await interaction.reply({ content: 'Unknown command.', ephemeral: true });
            break;
    }
});

// Log in to Discord
client.login(TOKEN);
