require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const responses = require("./responses");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {

    // Ignore bots
    if (message.author.bot) return;

    // Pick random reply
    const reply = responses[Math.floor(Math.random() * responses.length)];

    // Reply to message
    message.reply(reply);
});

client.login(process.env.TOKEN);
