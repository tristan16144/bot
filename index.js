import { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

const forbiddenWords = /\b(nigg|nigga|nigger|n1gger|n1gga|nigg3r|niggaz|nigguh|niggr|ni99a|ni99er|n!gger|n!gga|n!gg3r|n!ggaz|n!gguh|n!ggr)\b/i;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // Required for ban/kick
  ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});
const warns = new Map();
const MOD_ROLE_NAME = "Moderator"; // Change this to your desired role name
const MOD_ROLE_ID = '1416565649303535809'; // Replace with your mod role ID

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const member = message.member;
  const hasModRole = member.roles.cache.some(role => role.name === MOD_ROLE_NAME);

  if (message.content.startsWith('!kick')) {
    if (!hasModRole) return message.reply("You don't have permission to kick members.");
    const target = message.mentions.members.first();
    if (!target) return message.reply("Mention someone to kick.");
    try {
      await target.kick();
      message.reply(`${target.user.username} has been kicked.`);
    } catch (err) {
      message.reply("Failed to kick member.");
      console.error(err);
    }
  }

  if (message.content.startsWith('!ban')) {
    if (!hasModRole) return message.reply("You don't have permission to ban members.");
    const target = message.mentions.members.first();
    if (!target) return message.reply("Mention someone to ban.");
    try {
      await target.ban();
      message.reply(`${target.user.username} has been banned.`);
    } catch (err) {
      message.reply("Failed to ban member.");
      console.error(err);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith('!embed')) {
    if (!hasModRole) return message.reply("You don't have permission to embed messages.");
    const args = message.content.slice(7).trim().split(' ');

    // Extract channel mention and hex color
    const channelMention = args.find(arg => arg.startsWith('<#') && arg.endsWith('>'));
    const hexColor = args.find(arg => /^#?[0-9A-Fa-f]{6}$/.test(arg));

    if (!channelMention || !hexColor) {
      return message.reply("Usage: `!embed Title Description #channel #hexcolor`");
    }

    const channelId = channelMention.replace(/[<#>]/g, '');
    const targetChannel = message.guild.channels.cache.get(channelId);
    if (!targetChannel || !targetChannel.isTextBased()) {
      return message.reply("Invalid channel mention.");
    }

    // Remove channel and color from args to get title and description
    const filteredArgs = args.filter(arg => arg !== channelMention && arg !== hexColor);
    const title = filteredArgs[0];
    const description = filteredArgs.slice(1).join(' ');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(hexColor.startsWith('#') ? hexColor : `#${hexColor}`)
      .setFooter({ text: `Sent by ${message.author.username}` })
      .setTimestamp();

    try {
      await targetChannel.send({ embeds: [embed] });
      message.reply(`✅ Embed sent to ${targetChannel.name}`);
    } catch (err) {
      console.error(err);
      message.reply("❌ Failed to send embed.");
    }
  }
});
// Replace with your actual welcome channel ID
const WELCOME_CHANNEL_ID = '1416571553742721045';

client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x7900EB) // Vortxx purple 💜
    .setTitle(`Welcome ${member.displayName}!`)
    .setDescription(`Welcome to **Vortxx KitPvP's Discord**! Enjoy your stay.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith('!warn')) {
    const args = message.content.split(' ');
    const target = message.mentions.members.first();
    const reason = args.slice(2).join(' ');

    if (!target || !reason) {
      return message.reply("Usage: `!warn @user reason`");
    }

    // DM the user
    try {
      await target.send(`⚠️ You have been warned in **Vortxx** for: ${reason}`);
    } catch {
      message.reply("Couldn't DM the user.");
    }

    // Track warnings
    const userId = target.id;
    const currentWarns = warns.get(userId) || 0;
    warns.set(userId, currentWarns + 1);

    message.reply(`${target.user.username} has been warned. (${currentWarns + 1}/3)`);

    // Temp ban if 3 warnings
    if (warns.get(userId) >= 3) {
      try {
        await target.ban({ reason: `3 warnings: ${reason}` });
        message.channel.send(`${target.user.username} has been temporarily banned for 1 day.`);

        // Unban after 24 hours
        setTimeout(async () => {
          try {
            await message.guild.members.unban(userId);
            warns.set(userId, 0); // Reset warnings
          } catch (err) {
            console.error(`Failed to unban: ${err}`);
          }
        }, 24 * 60 * 60 * 1000); // 1 day in ms
      } catch (err) {
        console.error(err);
        message.reply("Failed to ban the user.");
      }
    }
  }
});

// roles
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Only respond to !addrole or !removerole
  if (!message.content.startsWith('!addrole') && !message.content.startsWith('!removerole')) return;

  const member = message.member;
  const hasModRole = member.roles.cache.some(role => role.name === "Moderator");
  if (!hasModRole) return message.reply("You don't have permission to use this command.");

  const args = message.content.split(' ');
  const command = args[0];
  const target = message.mentions.members.first();
  const roleId = args[2];

  if (!target || !roleId) {
    return message.reply("Usage: `!addrole @user ROLE_ID` or `!removerole @user ROLE_ID`");
  }

  const role = message.guild.roles.cache.get(roleId);
  if (!role) return message.reply(`Role with ID "${roleId}" not found.`);

  if (command === '!addrole') {
    if (target.roles.cache.has(role.id)) {
      return message.reply(`${target.user.username} already has that role.`);
    }
    await target.roles.add(role);
    message.reply(`✅ Added role to ${target.user.username}.`);
  }

  if (command === '!removerole') {
    if (!target.roles.cache.has(role.id)) {
      return message.reply(`${target.user.username} doesn't have that role.`);
    }
    await target.roles.remove(role);
    message.reply(`✅ Removed role from ${target.user.username}.`);
  }
});
// help
const helpMessage = `
**Vortxx Bot Help Menu**
Here are some commands you can use:
-- ADMIN COMMANDS --
- \`!warn @user reason\` — Warn a user
- \`!addrole @user ROLE_ID\` — Add a role by ID
- \`!removerole @user ROLE_ID\` — Remove a role by ID
- \`!embed Title Description #channel #hexcolor\` — Send a custom embed
-- NON ADMIN COMMANDS --
- \`!help\` — Show this help message
`;
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '!help') {
    message.reply(helpMessage);
  }
});
// N-word filter with 1 minute mute
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check for N-word (case-insensitive)
  const forbidden = /\b(nigg|nigga|nigger|n1gger|n1gga|nigg3r|niggaz|nigguh|niggr|ni99a|ni99er|n!gger|n!gga|n!gg3r|n!ggaz|n!gguh|n!ggr)\b/i;


  if (forbidden.test(message.content)) {
    try {
      // Delete the message
      await message.delete();

      // Timeout the member for 1 minute (60,000 ms)
      const member = await message.guild.members.fetch(message.author.id);
      await member.timeout(60_000, 'Used forbidden word');

      // Optional: Notify the channel or send DM
      await message.channel.send({
        content: `${member} has been muted for 1 minute for using prohibited language.`,
      });
    } catch (err) {
      console.error('Error handling forbidden word:', err);
    }
  }
});
const TICKET_CATEGORY_ID = '1416583333919326248'; // Replace with your category ID
const TICKET_PANEL_CHANNEL_ID = '1416583278550581348'; // Where the "Create Ticket" button is posted


client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  sendTicketPanel();
});

async function sendTicketPanel() {
  try {
    const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('🎫 Create Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    const embed = new EmbedBuilder()
      .setTitle('Need Help?')
      .setDescription('Click the button below to create a support ticket.')
      .setColor(0x5865F2);

    await channel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error('❌ Failed to send ticket panel:', err);
  }
}

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (forbiddenWords.test(message.content)) {
    try {
      await message.delete();
      const member = await message.guild.members.fetch(message.author.id);
      await member.timeout(60_000, 'Used forbidden language');
      await message.channel.send(`${member} has been muted for 1 minute for using prohibited language.`);
    } catch (err) {
      console.error('❌ Error handling forbidden word:', err);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const { guild, user, customId } = interaction;

  if (customId === 'create_ticket') {
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id: MOD_ROLE_ID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      });

      await ticketChannel.send({
        content: `<@${user.id}> You created a ticket successfully. Wait for a mod to respond.\n<@&${MOD_ROLE_ID}>`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('close_ticket')
              .setLabel('🗑️ Close Ticket')
              .setStyle(ButtonStyle.Danger)
          )
        ],
        embeds: [
          new EmbedBuilder().setFooter({ text: `UserID:${user.id}` })
        ]
      });

      await interaction.editReply({ content: '✅ Ticket created!' });
    } catch (err) {
      console.error('❌ Error creating ticket:', err);
      await interaction.editReply({ content: '❌ Failed to create ticket.' });
    }
  }

  if (customId === 'close_ticket') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(MOD_ROLE_ID)) {
      return interaction.reply({ content: '❌ You don’t have permission to close this ticket.', ephemeral: true });
    }

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      let transcript = `📄 **Transcript for ${interaction.channel.name}**\n\n`;
      for (const msg of sorted) {
        const author = msg.author?.tag || 'Unknown';
        const content = msg.content || '[Embed/Attachment]';
        transcript += `**${author}**: ${content}\n`;
      }

      const firstMessage = sorted[0];
      const userId = firstMessage?.embeds[0]?.footer?.text?.replace('UserID:', '');
      const ticketCreator = await interaction.guild.members.fetch(userId);

      if (ticketCreator) {
        await ticketCreator.send(transcript.slice(0, 2000));
      }

      await interaction.reply({ content: '✅ Ticket closed and transcript sent.', ephemeral: true });
      await interaction.channel.delete();
    } catch (err) {
      console.error('❌ Error sending transcript:', err);
      await interaction.reply({ content: '❌ Failed to send transcript or close ticket.', ephemeral: true });
    }
  }
});
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!lockdown')) return;

  const member = message.member;
  const hasModRole = member.roles.cache.has(MOD_ROLE_ID);
  if (!hasModRole) return message.reply("You don't have permission to use this command.");

  try {
    await message.channel.permissionOverwrites.edit(message.guild.id, {
      SendMessages: false
    });

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Channel Locked Down')
      .setDescription(`Successfully locked down **${message.channel.name}**.`)
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('❌ Error locking down channel:', err);
    message.reply('❌ Failed to lock down the channel.');
  }
});
// login/MAIN/DONT TOUCH
client.login('MTQxNjU1NTgyMTkzMTY5NjI4OQ.GpSnvz.0KgY4zOEzC-kZ65BE9OOdHCyKtNDPSnRY2Mzss');