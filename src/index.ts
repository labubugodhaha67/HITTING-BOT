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
  type Interaction,
  type GuildMember,
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
    opt
      .setName("text")
      .setDescription("Body text of the embed")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("buttons")
      .setDescription(
        'Optional buttons — format: "Label 1 | DM Text 1 ; Label 2 | DM Text 2" (up to 20)',
      )
      .setRequired(false),
  );

const ticketPanelCommand = new SlashCommandBuilder()
  .setName("ticketpanel")
  .setDescription("Create a ticket panel with a button to open support tickets")
  .addStringOption((opt) =>
    opt.setName("title").setDescription("Title of the embed").setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("text")
      .setDescription("Body text of the embed")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("button_emoji")
      .setDescription("Emoji to show on the button (e.g. 🎫)")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("button_text")
      .setDescription("Text label on the button")
      .setRequired(true),
  );

export async function startBot(): Promise<void> {
  if (!token || !clientId) {
    logger.warn(
      "DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID not set — bot will not start",
    );
    return;
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", async () => {
    logger.info({ tag: client.user?.tag }, "Discord bot logged in");

    try {
      const rest = new REST({ version: "10" }).setToken(token);
      await rest.put(Routes.applicationCommands(clientId), {
        body: [panelCommand.toJSON(), ticketPanelCommand.toJSON()],
      });
      logger.info("Slash commands registered globally");
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
  });

  client.on("interactionCreate", async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "panel") {
        await handlePanelCommand(interaction);
      } else if (interaction.commandName === "ticketpanel") {
        await handleTicketPanelCommand(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("pb_")) {
        await handlePanelButtonClick(interaction);
      } else if (interaction.customId.startsWith("ticket_open_")) {
        await handleTicketOpen(interaction, client);
      }
    }
  });

  client.on("error", (err) => {
    logger.error({ err }, "Discord client error");
  });

  try {
    await client.login(token);
  } catch (err) {
    logger.error({ err }, "Failed to log in to Discord");
  }
}

async function handlePanelCommand(
  interaction: Extract<
    Interaction,
    { isChatInputCommand(): true; commandName: "panel" }
  >,
): Promise<void> {
  const title = interaction.options.getString("title", true);
  const text = interaction.options.getString("text", true);
  const buttonsRaw = interaction.options.getString("buttons");

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(text)
    .setColor(0x3b82f6);

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  if (buttonsRaw) {
    const defs = buttonsRaw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    let currentRow = new ActionRowBuilder<ButtonBuilder>();
    let inRow = 0;

    for (const def of defs) {
      const pipeIdx = def.indexOf("|");
      if (pipeIdx === -1) continue;
      const label = def.slice(0, pipeIdx).trim();
      const dmText = def.slice(pipeIdx + 1).trim();
      if (!label || !dmText) continue;

      const id = `pb_${++buttonCounter}`;
      buttonStore.set(id, dmText);

      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(id)
          .setLabel(label.slice(0, 80))
          .setStyle(ButtonStyle.Primary),
      );
      inRow++;

      if (inRow === 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
        inRow = 0;
      }
    }

    if (inRow > 0) rows.push(currentRow);
  }

  await interaction.reply({ embeds: [embed], components: rows });
}

async function handleTicketPanelCommand(
  interaction: Extract<
    Interaction,
    { isChatInputCommand(): true; commandName: "ticketpanel" }
  >,
): Promise<void> {
  const title = interaction.options.getString("title", true);
  const text = interaction.options.getString("text", true);
  const buttonEmoji = interaction.options.getString("button_emoji", true);
  const buttonText = interaction.options.getString("button_text", true);

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(text)
    .setColor(0x3b82f6);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open_btn")
      .setLabel(buttonText.slice(0, 80))
      .setEmoji(buttonEmoji)
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function handlePanelButtonClick(
  interaction: Extract<Interaction, { isButton(): true }>,
): Promise<void> {
  const dmText = buttonStore.get(interaction.customId);

  if (!dmText) {
    await interaction.reply({
      content:
        "This button is no longer active (the bot was restarted). Ask a moderator to recreate the panel.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.user.send({ content: dmText });
    await interaction.reply({ content: "✅ Check your DMs!", ephemeral: true });
  } catch {
    await interaction.reply({
      content:
        "❌ I couldn't send you a DM. Please enable DMs from server members and try again.",
      ephemeral: true,
    });
  }
}

async function handleTicketOpen(
  interaction: Extract<Interaction, { isButton(): true }>,
  client: Client,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "This can only be used inside a server.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const categoryName = "Support Tickets";
    let category = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === categoryName,
    );

    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
      });
    }

    const ticketChannelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    const existingTicket = guild.channels.cache.find(
      (c) =>
        c.name === ticketChannelName &&
        "parentId" in c &&
        c.parentId === category!.id,
    );

    if (existingTicket) {
      await interaction.editReply({
        content: `❌ You already have an open ticket: <#${existingTicket.id}>`,
      });
      return;
    }

    const botMember = guild.members.cache.get(client.user!.id);

    const ticketChannel = await guild.channels.create({
      name: ticketChannelName,
      type: ChannelType.GuildText,
      parent: category.id,
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
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        ...(botMember
          ? [
              {
                id: botMember.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
            ]
          : []),
      ],
    });

    const welcomeEmbed = new EmbedBuilder()
      .setDescription(
        `<@${interaction.user.id}> thank you for making a ticket, an owner will be here to support you shortly`,
      )
      .setColor(0x3b82f6);

    await ticketChannel.send({ embeds: [welcomeEmbed] });

    await interaction.editReply({
      content: `✅ Your ticket has been created: <#${ticketChannel.id}>`,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create ticket channel");
    await interaction.editReply({
      content:
        "❌ Failed to create your ticket. Make sure the bot has permission to manage channels.",
    });
  }
}
