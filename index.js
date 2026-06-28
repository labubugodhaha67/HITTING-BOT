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

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const reply = responses[Math.floor(Math.random() * responses.length)];

    try {
        await message.reply(reply);
    } catch (error) {
        console.error("Failed to reply:", error);
    }
});

client.login(process.env.TOKEN);
