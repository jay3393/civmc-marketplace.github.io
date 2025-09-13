import {
    Client,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
    Events,
    ChannelType,
    PermissionsBitField,
  } from "discord.js";
  import fetch from "node-fetch";
  
  /** ---------- ENV ---------- **/
  const TOKEN = process.env.DISCORD_BOT_TOKEN;      // e.g. "MzI...your token"
  const APP_ID = process.env.DISCORD_APP_ID;        // your Application (Client) ID
  const INGEST_URL = process.env.INGEST_URL;        // https://<ref>.supabase.co/functions/v1/ingest-forum-thread
  const SUPABASE_BEARER = process.env.SUPABASE_BEARER; // shared secret
  const SUPABASE_API_KEY = process.env.SUPABASE_ANON_KEY; // shared secret
  const LOG_LEVEL = process.env.LOG_LEVEL || "info";

  function log(level, msg, extra = {}, allow = []) {
    if (level === 'debug' && LOG_LEVEL !== 'debug') return;
    const base = { t: new Date().toISOString(), level, msg };
    const safe = {};
    for (const key of allow) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        safe[key] = extra[key];
      }
    }
    (level === 'error' ? console.error : console.log)({ ...base, ...safe });
  }
  
  if (!TOKEN || !APP_ID || !INGEST_URL || !SUPABASE_BEARER) {
    log('error', 'Missing env vars: DISCORD_BOT_TOKEN, DISCORD_APP_ID, INGEST_URL, SUPABASE_BEARER');
    process.exit(1);
  }
  
  /** ---------- BOT CLIENT ---------- **/
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // enable in Dev Portal if you want starter message text
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
  });
  
  /** ---------- INVITE LINK (permissions) ---------- **/
  function buildInviteURL(appId = APP_ID) {
    // Minimal set for your use-case: ingest forum threads + set up forum + post embeds
    const perms = new PermissionsBitField();
    perms.add(
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.SendMessagesInThreads,
      PermissionsBitField.Flags.CreatePublicThreads,
      // PermissionsBitField.Flags.ManageThreads,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.AttachFiles,
      // PermissionsBitField.Flags.AddReactions
    );
    const permissions = perms.bitfield.toString(); // bigint -> string
    log('debug', 'calculated permissions', { permissions }, ['permissions']);
    log('debug', 'expected permissions', { expected: '309237763072' }, ['expected']);
    // Scopes: bot + application commands (for slash commands)
    return `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=${permissions}&scope=bot%20applications.commands`;
  }
  
  /** ---------- COMMANDS ---------- **/
  async function registerCommands(guildId) {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(APP_ID, guildId), {
      body: [
        {
          name: "contracts-setup",
          description: "Set the forum channel to ingest contracts from",
          options: [
            {
              type: 7, // CHANNEL
              name: "forum",
              description: "Forum channel",
              required: true,
              channel_types: [ChannelType.GuildForum],
            },
          ],
        },
        {
          name: "invite",
          description: "Get the bot invite link (with the correct permissions)",
        },
        {
          name: "contracts-unsetup",
          description: "Stop ingesting contracts from this server",
        },
      ],
    });
    log('info', '[commands] Registered in guild', { guildId }, ['guildId']);
  }
  
  /** ---------- LIFECYCLE ---------- **/
  client.on(Events.ClientReady, async () => {
    // Register in ALL guilds the bot is already in
    const guilds = await client.guilds.fetch();
    for (const [id] of guilds) {
        await registerCommands(id);
    }
    log('info', 'logged in', { user: client.user.tag }, ['user']);
    log('info', 'invite url', { url: buildInviteURL() }, ['url']);
    log('info', 'share with nation admins');
  });
  
  client.on(Events.GuildCreate, async (guild) => {
    try {
      await registerCommands(guild.id);
    } catch (e) {
      log('error', '[commands] register failed', { error: e?.message }, ['error']);
    }
  });
  
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
  
      // /invite: reply ephemerally with the link
      if (interaction.commandName === "invite") {
        return interaction.reply({
          content: `🔗 **Invite me to your server:**\n${buildInviteURL()}\n\n` +
                   `> Requires permissions: View Channels, Read Message History, Send Messages, Send Messages in Threads, Create Public Threads, Manage Threads, Embed Links, Attach Files.`,
          ephemeral: true,
        });
      }
  
      // /contracts-setup forum:<#forum>
      if (interaction.commandName === "contracts-setup") {
        const forum = interaction.options.getChannel("forum", true);
        if (forum?.type !== ChannelType.GuildForum) {
          return interaction.reply({ content: "Please pick a **Forum** channel.", ephemeral: true });
        }

        // Ensure the bot can read the selected forum channel
        const me = interaction.guild?.members.me;
        const perms = forum.permissionsFor(me ?? interaction.client.user);
        const hasView = perms?.has(PermissionsBitField.Flags.ViewChannel);
        const hasRead = perms?.has(PermissionsBitField.Flags.ReadMessageHistory);
        if (!hasView || !hasRead) {
          return interaction.reply({
            content: `❌ I don't have permission to read <#${forum.id}>. Please grant me "View Channels" and "Read Message History" for that forum channel and try again.`,
            ephemeral: true,
          });
        }
 
        const payload = {
          type: "setup_forum",
          guild_id: interaction.guildId,
          guild_name: interaction.guild?.name ?? "",
          forum_channel_id: forum.id,
          invoker_id: interaction.user.id,
        };
  
        const r = await fetch(INGEST_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_BEARER}`,
            "apikey": `${SUPABASE_API_KEY}`
          },
          body: JSON.stringify(payload),
        });
  
        if (r.ok) {
          await interaction.reply({ content: `✅ Ingesting contracts from <#${forum.id}>\nView your ingested contracts at https://civhub.net/contracts`, ephemeral: true });
        } else {
          const t = await r.text();
          await interaction.reply({ content: `❌ Failed to save: ${t}`, ephemeral: true });
        }
      }
    } catch (e) {
      log('error', '[interaction] error', { error: e?.message }, ['error']);
    }
  });
  
  /** ---------- THREAD INGEST ---------- **/
  client.on(Events.ThreadCreate, async (thread) => {
    try {
      const parent = thread.parent;
      if (!parent || parent.type !== ChannelType.GuildForum) return;
  
      const payload = {
        type: "thread_create",
        guild_id: thread.guild.id,
        parent_forum_id: parent.id,
        thread_id: thread.id,
        thread_name: thread.name,
      };
  
      try {
        const starter = await thread.fetchStarterMessage();
        if (starter) {
          payload["starter_message_id"] = starter.id;
          payload["starter_content"] = starter.content ?? "";
          payload["starter_embeds"] = starter.embeds ?? [];
          payload["starter_attachments"] = [...starter.attachments.values()].map((a) => ({
            url: a.url,
            name: a.name,
          }));
          payload["author_id"] = starter.author?.id;
          payload["author_username"] = starter.author?.username;
        }
      } catch (e) {
        log("No starter message or missing perms", e?.message);
      }
  
      const r = await fetch(INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_BEARER}`,
        },
        body: JSON.stringify(payload),
      });
  
      if (!r.ok) {
        const t = await r.text();
        log('error', '[ingest] failed', { status: r.status, body: t }, ['status', 'body']);
      } else {
        log("[ingest] ok for thread", thread.id);
      }
    } catch (e) {
      log('error', '[thread_create] error', { error: e?.message }, ['error']);
    }
  });
  
  /** ---------- START ---------- **/
  client.login(TOKEN);