import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from "discord.js";

import { logger } from "./lib/logger";

const token = process.env["DISCORD_BOT_TOKEN"];
const clientId = process.env["DISCORD_CLIENT_ID"];

const buttonStore = new Map<string, string>();
let buttonCounter = 0;

const panelCommand = new SlashCommandBuilder()
  .setName("panel")
  .setDescription("Create a panel");

const ticketPanelCommand = new SlashCommandBuilder()
  .setName("ticketpanel")
  .setDescription("Create a ticket panel");

const buttonCommand = new SlashCommandBuilder()
  .setName("button")
  .setDescription("Create a clickable button")
  .addStringOption((opt) =>
    opt
      .setName("button_text")
      .setDescription("Text shown on button")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("message")
      .setDescription("Message sent when clicked")
      .setRequired(true),
  );


export async function startBot() {
  if (!token || !clientId) {
    logger.warn("Missing token or client id");
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });


  client.once("ready", async () => {
    logger.info(`Logged in as ${client.user?.tag}`);

    const rest = new REST({ version: "10" }).setToken(token);

    await rest.put(
      Routes.applicationCommands(clientId),
      {
        body: [
          panelCommand.toJSON(),
          ticketPanelCommand.toJSON(),
          buttonCommand.toJSON(),
        ],
      },
    );

    logger.info("Commands registered");
  });


  client.on("interactionCreate", async (interaction) => {

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "button") {

        const buttonText =
          interaction.options.getString("button_text", true);

        const message =
          interaction.options.getString("message", true);


        const id = `pb_${++buttonCounter}`;

        buttonStore.set(id, message);


        await interaction.channel?.send({
          components: [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(id)
                  .setLabel(buttonText.slice(0,80))
                  .setStyle(ButtonStyle.Primary),
              ),
          ],
        });


        await interaction.reply({
          content: "Button created",
          ephemeral: true,
        });

        return;
      }

    }


    if (interaction.isButton()) {

      const msg = buttonStore.get(interaction.customId);


      if (!msg) {
        await interaction.reply({
          content: "This button expired.",
          ephemeral: true,
        });

        return;
      }


      await interaction.user.send(msg);


      await interaction.reply({
        content: "Sent to your DMs!",
        ephemeral: true,
      });
    }

  });


  await client.login(token);
}


startBot();
