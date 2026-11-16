const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');
const { refreshBoards } = require('./board');
const { fail } = require('./utils');

const missing = ['DISCORD_TOKEN', 'GUILD_ID'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Each module exports { commands, components }. Component handlers are keyed by the
// customId part before ":" (e.g. "cfg_user:3" → "cfg_user").
const modules = [require('./commands/stat'), require('./commands/config'), require('./commands/reglement')];
const commands = modules.flatMap((m) => m.commands);
const components = Object.assign({}, ...modules.map((m) => m.components ?? {}));
const commandMap = new Map(commands.map((c) => [c.data.name, c]));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerCommands(guild) {
  try {
    const list = await guild.commands.set(commands.map((c) => c.data.toJSON()));
    console.log(`✅ Registered ${list.size} slash commands on "${guild.name}"`);
  } catch (e) {
    console.error('❌ Command registration failed:', e.message);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 Logged in as ${c.user.tag}`);
  const guild = c.guilds.cache.get(config.guildId);
  if (guild) await registerCommands(guild);
  else console.error('❌ The bot is not in the server set in GUILD_ID (invite it, commands will register automatically)');

  // Refresh published boards every 5 minutes (cooldowns that end, avatars, names)
  refreshBoards(c).catch(console.error);
  setInterval(() => refreshBoards(c).catch(console.error), 5 * 60_000);
});

client.on(Events.GuildCreate, (guild) => {
  if (guild.id === config.guildId) registerCommands(guild);
});

client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isChatInputCommand()) await commandMap.get(i.commandName)?.execute(i);
    else if (i.isMessageComponent() || i.isModalSubmit()) await components[i.customId.split(':')[0]]?.(i);
  } catch (err) {
    console.error(err);
    const payload = fail(`Algo salió mal: \`${String(err.message).slice(0, 300)}\``);
    if (i.replied || i.deferred) await i.followUp(payload).catch(() => {});
    else await i.reply(payload).catch(() => {});
  }
});

client.on(Events.Error, (e) => console.error('❌ Client error:', e.message));
client.on(Events.Warn, (m) => console.warn('⚠️', m));
client.on(Events.ShardDisconnect, (e) => console.error(`❌ Disconnected from Discord (code ${e.code})`));

console.log(`🔌 Connecting to Discord... (token length: ${config.token.length})`);
const timer = setTimeout(
  () => console.error('⏳ Still not connected after 30s. Check DISCORD_TOKEN (Developer Portal > Bot > Reset Token).'),
  30_000,
);
client.once(Events.ClientReady, () => clearTimeout(timer));

client.login(config.token).catch((e) => {
  console.error(`❌ Login failed: ${e.message}`);
  console.error('   → Copy a fresh token from Developer Portal > Bot > Reset Token into DISCORD_TOKEN.');
  process.exit(1);
});
