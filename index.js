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
                .setDescription("Choose the reply channel")
                .setRequired(true)
        )
].map(command => command.toJSON());


client.once("ready", async () => {

    console.log(`Logged in as ${client.user.tag}`);

    const rest = new REST({ version: "10" })
        .setToken(process.env.TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(
            client.user.id,
            process.env.GUILD_ID
        ),
        {
            body: commands
        }
    );

    console.log("Slash command registered");
});


client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;


    if (interaction.commandName === "reply") {

        if (!interaction.member.permissions.has(
            PermissionsBitField.Flags.ManageChannels
        )) {
            return interaction.reply({
                content: "You need Manage Channels permission.",
                ephemeral: true
            });
        }


        replyChannel = interaction.options.getChannel("channel");


        interaction.reply({
            content: `Replies are now enabled in ${replyChannel}`,
            ephemeral: true
        });
    }
});


client.on("messageCreate", async message => {

    if (message.author.bot) return;

    if (!replyChannel) return;

    if (message.channel.id !== replyChannel.id) return;


    const reply =
        responses[Math.floor(Math.random() * responses.length)];


    message.reply(reply);

});


client.login(process.env.TOKEN);
