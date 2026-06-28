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


let replyChannelId = null;


const commands = [
    new SlashCommandBuilder()
        .setName("reply")
        .setDescription("Set the channel where the bot replies")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Choose the channel")
                .setRequired(true)
        )
].map(command => command.toJSON());



client.once("ready", async () => {

    console.log(`Logged in as ${client.user.tag}`);


    const rest = new REST({ version: "10" })
        .setToken(process.env.TOKEN);


    // Remove old global commands
    await rest.put(
        Routes.applicationCommands(client.user.id),
        {
            body: []
        }
    );


    // Add server command
    await rest.put(
        Routes.applicationGuildCommands(
            client.user.id,
            process.env.GUILD_ID
        ),
        {
            body: commands
        }
    );


    console.log("Slash command loaded");

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


        const channel =
            interaction.options.getChannel("channel");


        replyChannelId = channel.id;


        console.log(
            "Reply channel set:",
            replyChannelId
        );


        await interaction.reply({
            content: `Bot replies are now enabled in ${channel}`,
            ephemeral: true
        });

    }

});



client.on("messageCreate", async message => {


    if (message.author.bot) return;


    if (!replyChannelId) return;


    if (message.channel.id !== replyChannelId) return;



    const msg =
        responses[
            Math.floor(Math.random() * responses.length)
        ];



    if (!msg) return;



    try {

        await message.reply(msg);

    } catch (error) {

        console.log("Reply error:", error);

    }


});



client.login(process.env.TOKEN);
