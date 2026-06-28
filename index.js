require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionsBitField
} = require("discord.js");

const responses = require("./responses");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let replyChannel = null;

const commands = [
    new SlashCommandBuilder()
        .setName("reply")
        .setDescription("Set the channel where the bot replies")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel for bot replies")
                .setRequired(true)
        )
].map(command => command.toJSON());


const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
    );

    console.log("Slash command loaded");
});


client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "reply") {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({
                content: "You need Manage Channels permission.",
                ephemeral: true
            });
        }

        replyChannel = interaction.options.getChannel("channel");

        await interaction.reply({
            content: `Bot replies are now locked to ${replyChannel}.`,
            ephemeral: true
        });
    }
});


client.on("messageCreate", async message => {

    if (message.author.bot) return;

    // Only reply in selected channel
    if (!replyChannel) return;

    if (message.channel.id !== replyChannel.id) return;


    const reply =
        responses[Math.floor(Math.random() * responses.length)];

    try {
        await message.reply(reply);
    } catch (error) {
        console.error(error);
    }
});


client.login(process.env.TOKEN);
