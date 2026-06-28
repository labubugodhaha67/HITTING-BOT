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
        .setDescription("Choose the channel the bot replies in")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel")
                .setRequired(true)
        )
].map(x => x.toJSON());


client.once("ready", async () => {

    console.log(`Logged in as ${client.user.tag}`);

    const rest = new REST({version:"10"})
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

    console.log("Command ready");

});


client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;


    if (interaction.commandName === "reply") {


        const channel =
            interaction.options.getChannel("channel");


        replyChannelId = channel.id;


        await interaction.reply({
            content:`Bot will reply in ${channel}`,
            ephemeral:true
        });


        console.log("Reply channel:", replyChannelId);

    }

});


client.on("messageCreate", async message => {


    console.log("Message seen:", message.content);


    if (message.author.bot) return;


    if (!replyChannelId) {
        console.log("No channel selected");
        return;
    }


    if (message.channel.id !== replyChannelId) return;


    const msg =
        responses[Math.floor(Math.random()*responses.length)];


    await message.reply(msg);


});


client.login(process.env.TOKEN);
