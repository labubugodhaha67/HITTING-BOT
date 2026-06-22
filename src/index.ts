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
  .setDescription("Create a panel embed with up to 20 clickable buttons")
  .addStringOption((opt) =>
    opt.setName("title").setDescription("Title of the embed").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("text").setDescription("Body text of the embed").setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("buttons")
      .setDescription('Optional buttons — format: "Label | DM Text ; Label | DM Text"')
      .setRequired(false),
  );

const ticketPanelCommand = new SlashCommandBuilder()
  .setName("ticketpanel")
  .setDescription("Create a ticket panel")
  .addStringOption((opt) =>
    opt.setName("title").setDescription("Title").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("text").setDescription("Text").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("button_emoji").setDescription("Emoji").setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName("button_text").setDescription("Button text").setRequired(true),
  );

export async function startBot(): Promise<void> {
  if (!token || !clientId) {
    logger.warn("Missing bot token or client id");
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", async () => {
    logger.info(`Logged in as ${client.user?.tag}`);

    const rest = new REST({ version: "10" }).setToken(token);

    await rest.put(Routes.applicationCommands(clientId), {
      body: [
        panelCommand.toJSON(),
        ticketPanelCommand.toJSON(),
      ],
    });

    logger.info("Commands registered");
  });

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "panel") {
        await handlePanelCommand(interaction);
      }

      if (interaction.commandName === "ticketpanel") {
        await handleTicketPanelCommand(interaction);
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("pb_")) {
        await handlePanelButtonClick(interaction);
      }

      if (interaction.customId === "ticket_open_btn") {
        await handleTicketOpen(interaction, client);
      }
    }
  });

  await client.login(token);
}

async function handlePanelCommand(
  interaction: ChatInputCommandInteraction,
) {
  const title = interaction.options.getString("title", true);
  const text = interaction.options.getString("text", true);
  const buttonsRaw = interaction.options.getString("buttons");

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(text)
    .setColor(0x3b82f6);

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  if (buttonsRaw) {
    const defs = buttonsRaw.split(";").slice(0, 20);

    let row = new ActionRowBuilder<ButtonBuilder>();

    for (const def of defs) {
      const parts = def.split("|");

      if (!parts[0] || !parts[1]) continue;

      const id = `pb_${++buttonCounter}`;

      buttonStore.set(id, parts[1].trim());

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(id)
          .setLabel(parts[0].trim())
          .setStyle(ButtonStyle.Primary),
      );
    }

    rows.push(row);
  }

  await interaction.reply({
    embeds: [embed],
    components: rows,
  });
}

async function handleTicketPanelCommand(
  interaction: ChatInputCommandInteraction,
) {
  const embed = new EmbedBuilder()
    .setTitle(interaction.options.getString("title", true))
    .setDescription(interaction.options.getString("text", true))
    .setColor(0x3b82f6);

  const button = new ButtonBuilder()
    .setCustomId("ticket_open_btn")
    .setLabel(interaction.options.getString("button_text", true))
    .setEmoji(interaction.options.getString("button_emoji", true))
    .setStyle(ButtonStyle.Primary);

  await interaction.reply({
    embeds: [embed],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(button),
    ],
  });
}

async function handlePanelButtonClick(
  interaction: ButtonInteraction,
) {
  const msg = buttonStore.get(interaction.customId);

  if (!msg) {
    await interaction.reply({
      content: "Button expired.",
      ephemeral: true,
    });
    return;
  }

  await interaction.user.send(msg);

  await interaction.reply({
    content: "Sent!",
    ephemeral: true,
  });
}

async function handleTicketOpen(
  interaction: ButtonInteraction,
  client: Client,
) {
  const guild = interaction.guild;

  if (!guild) return;

  await interaction.deferReply({
    ephemeral: true,
  });

  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
    ],
  });

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `<@${interaction.user.id}> ticket created`,
        )
        .setColor(0x3b82f6),
    ],
  });

  await interaction.editReply({
    content: `Created ${channel}`,
  });
}

startBot();
