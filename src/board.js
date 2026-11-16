// Builds the leaderboard message (1 embed per position, max 10) and keeps published copies up to date.
const { EmbedBuilder } = require('discord.js');
const config = require('./config');
const store = require('./store');

const MEDALS = ['🥇', '🥈', '🥉'];
const COLORS = [0xf1c40f, 0xc0c7cc, 0xcd7f32];
const EMPTY_COLOR = 0x2b2d31;

// "es" / "ES" -> 🇪🇸 ; anything else (an emoji, a name) is shown as is
function flag(country) {
  if (!country) return '🏳️';
  const c = country.trim();
  if (/^[a-z]{2}$/i.test(c)) {
    return [...c.toUpperCase()].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('');
  }
  return c;
}

function stateText(slot) {
  if (slot.state === 'busy') return '🔴 No disponible';
  if (slot.state === 'cooldown') {
    if (!slot.cooldownUntil) return '🟡 En cooldown';
    if (slot.cooldownUntil > Date.now()) {
      return `🟡 En cooldown · termina <t:${Math.floor(slot.cooldownUntil / 1000)}:R>`;
    }
  }
  return '🟢 Sin cooldown';
}

async function slotEmbed(client, slot, index) {
  const E = config.emojis;
  const position = index < 3 ? `${MEDALS[index]} #${index + 1}` : `#${index + 1}`;
  const user = slot.userId ? await client.users.fetch(slot.userId).catch(() => null) : null;
  const filled = Boolean(slot.userId || slot.name);

  if (!filled) {
    return new EmbedBuilder()
      .setColor(EMPTY_COLOR)
      .setTitle(`${position} · ???`)
      .setDescription(`${E.bottom} *Puesto disponible*`);
  }

  const name = slot.name || user?.globalName || user?.username || '???';
  const rows = [
    user && ['Jugador', `${user}`],
    ['Rango', slot.rank || '???'],
    ['Host', slot.host || 'Desconocido'],
    ['Estado', stateText(slot)],
    ['País', flag(slot.country)],
  ].filter(Boolean);
  const lines = rows.map(([label, value], i) => {
    const emoji = i === 0 ? E.top : i === rows.length - 1 ? E.bottom : E.middle;
    return `${emoji} **${label}:** ${value}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS[index] ?? config.color)
    .setTitle(`${position} · ${name}`.slice(0, 256))
    .setDescription(lines.join('\n'));
  if (user) embed.setThumbnail(user.displayAvatarURL({ size: 128 }));
  if (slot.image) embed.setImage(slot.image);
  return embed;
}

// ping: true only when the board is first posted, so players get notified once.
// (Editing a message never pings again.)
async function buildBoard(client, { ping = false } = {}) {
  const data = store.load();
  const embeds = await Promise.all(data.slots.map((slot, i) => slotEmbed(client, slot, i)));
  const userIds = [...new Set(data.slots.map((s) => s.userId).filter(Boolean))];
  const header = [
    `# 🏆 ${data.title}`,
    data.description,
    userIds.length ? `👥 ${userIds.map((id) => `<@${id}>`).join(' ')}` : '',
    `-# Actualizado <t:${Math.floor(Date.now() / 1000)}:R>`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    content: header.slice(0, 2000),
    embeds,
    allowedMentions: ping ? { users: userIds } : { parse: [] },
  };
}

// Edit every published board. Boards whose message was deleted are forgotten.
async function refreshBoards(client) {
  const data = store.load();
  if (!data.published.length) return;
  const payload = await buildBoard(client);
  const gone = [];

  for (const p of data.published) {
    try {
      const channel = await client.channels.fetch(p.channelId);
      const message = await channel.messages.fetch(p.messageId);
      await message.edit(payload);
    } catch (err) {
      // 10003 = unknown channel, 10008 = unknown message
      if (err.code === 10003 || err.code === 10008) gone.push(p.messageId);
      else console.error('Board refresh failed:', err.message);
    }
  }

  if (gone.length) {
    const fresh = store.load();
    fresh.published = fresh.published.filter((p) => !gone.includes(p.messageId));
    store.save(fresh);
  }
}

module.exports = { buildBoard, refreshBoards, slotEmbed, flag, stateText };
