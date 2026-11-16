// /config — interactive panel (menus, buttons, forms) to set up everything without typing commands.
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const store = require('../store');
const config = require('../config');
const { buildBoard, refreshBoards, slotEmbed, stateText } = require('../board');
const { postRules } = require('./reglement');
const { ok, fail } = require('../utils');

const MEDALS = ['🥇', '🥈', '🥉'];
const btn = (id, label, style = ButtonStyle.Secondary, emoji) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return b;
};
const row = (...items) => new ActionRowBuilder().addComponents(...items);

async function displayName(client, slot) {
  if (slot.name) return slot.name;
  if (slot.userId) {
    const u = await client.users.fetch(slot.userId).catch(() => null);
    if (u) return u.globalName || u.username;
  }
  return null;
}

// Push changes to published boards in the background (the panel answers instantly)
const refreshLater = (client) => refreshBoards(client).catch(console.error);

/* ---------------- Views ---------------- */

async function mainView(i) {
  const data = store.load();
  const names = await Promise.all(data.slots.map((s) => displayName(i.client, s)));
  const lines = data.slots.map((s, n) => {
    if (!names[n]) return `\`#${String(n + 1).padStart(2)}\` *libre*`;
    const who = s.userId ? `<@${s.userId}>` : `**${names[n]}**`;
    return `\`#${String(n + 1).padStart(2)}\` ${who} · ${s.rank || '???'} · ${stateText(s)}`;
  });

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle('⚙️ Panel de configuración')
    .setDescription(
      `**Título:** ${data.title}\n` +
        `**Tableros publicados:** ${data.published.length}\n\n` +
        lines.join('\n'),
    )
    .setFooter({ text: 'Elige un puesto en el menú para editarlo' });

  const select = new StringSelectMenuBuilder()
    .setCustomId('cfg_slot')
    .setPlaceholder('✏️ Elige un puesto para editar')
    .addOptions(
      data.slots.map((s, n) => {
        const opt = { label: `#${n + 1} · ${names[n] ?? 'Libre'}`.slice(0, 100), value: String(n) };
        if (n < 3) opt.emoji = MEDALS[n];
        return opt;
      }),
    );

  return {
    embeds: [embed],
    components: [
      row(select),
      row(
        btn('cfg_title', 'Título', ButtonStyle.Secondary, '🏷️'),
        btn('cfg_publish', 'Publicar aquí', ButtonStyle.Success, '📤'),
        btn('cfg_rules', 'Reglamento aquí', ButtonStyle.Secondary, '📜'),
        btn('cfg_refresh', 'Actualizar', ButtonStyle.Secondary, '🔄'),
        btn('cfg_clearall', 'Vaciar todo', ButtonStyle.Danger, '🗑️'),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

async function slotView(i, pos) {
  const data = store.load();
  const s = data.slots[pos];

  const header = new EmbedBuilder()
    .setColor(config.color)
    .setDescription(
      `✏️ Editando el puesto **#${pos + 1}**\n` +
        '-# 👤 Elige al jugador · 🚦 cambia el estado · 📝 rango, host, país, imagen.\n' +
        '-# Los tableros publicados se actualizan al instante.',
    );

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId(`cfg_user:${pos}`)
    .setPlaceholder('👤 Elegir jugador (@)')
    .setMinValues(0)
    .setMaxValues(1);
  if (s.userId) userSelect.setDefaultUsers(s.userId);

  const states = [
    { label: 'Sin cooldown', value: 'free', emoji: '🟢' },
    { label: 'No disponible', value: 'busy', emoji: '🔴' },
    { label: 'En cooldown (sin límite)', value: 'cd:0', emoji: '🟡' },
    ...[1, 2, 6, 12, 24, 48].map((h) => ({ label: `En cooldown ${h} h`, value: `cd:${h}`, emoji: '⏳' })),
  ];
  const stateSelect = new StringSelectMenuBuilder()
    .setCustomId(`cfg_state:${pos}`)
    .setPlaceholder(`🚦 Estado: ${stateText(s).replace(/<t:\d+:R>/, '…')}`.slice(0, 150))
    .addOptions(states);

  return {
    embeds: [header, await slotEmbed(i.client, s, pos)],
    components: [
      row(userSelect),
      row(stateSelect),
      row(
        btn(`cfg_edit:${pos}`, 'Editar datos', ButtonStyle.Primary, '📝'),
        btn(`cfg_up:${pos}`, 'Subir', ButtonStyle.Secondary, '⬆️').setDisabled(pos === 0),
        btn(`cfg_down:${pos}`, 'Bajar', ButtonStyle.Secondary, '⬇️').setDisabled(pos === store.SIZE - 1),
        btn(`cfg_clear:${pos}`, 'Vaciar puesto', ButtonStyle.Danger, '🧹'),
      ),
      row(
        btn('cfg_back', 'Volver', ButtonStyle.Secondary, '⬅️'),
        btn(`cfg_goto:${pos - 1}`, `#${pos}`, ButtonStyle.Secondary, '◀️').setDisabled(pos === 0),
        btn(`cfg_goto:${pos + 1}`, `#${pos + 2}`, ButtonStyle.Secondary, '▶️').setDisabled(pos === store.SIZE - 1),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

/* ---------------- Helpers ---------------- */

const posOf = (i) => Number(i.customId.split(':')[1]);

function updateSlot(pos, change) {
  const data = store.load();
  change(data.slots[pos], data);
  store.save(data);
}

function textInput(id, label, value, { placeholder, style = TextInputStyle.Short, max = 100, required = false } = {}) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(max);
  if (placeholder) input.setPlaceholder(placeholder);
  if (value) input.setValue(String(value).slice(0, max));
  return new ActionRowBuilder().addComponents(input);
}

/* ---------------- Command + handlers ---------------- */

const command = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Abre el panel para configurar la clasificación y el reglamento')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(i) {
    await i.reply({ ...(await mainView(i)), ephemeral: true });
  },
};

const handlers = {
  async cfg_slot(i) {
    await i.update(await slotView(i, Number(i.values[0])));
  },
  async cfg_goto(i) {
    await i.update(await slotView(i, posOf(i)));
  },
  async cfg_back(i) {
    await i.update(await mainView(i));
  },
  async cfg_refresh(i) {
    await i.update(await mainView(i));
    refreshLater(i.client);
  },

  async cfg_user(i) {
    const pos = posOf(i);
    updateSlot(pos, (s) => {
      s.userId = i.values[0] ?? null;
      s.name = null; // show the new player's name
    });
    await i.update(await slotView(i, pos));
    refreshLater(i.client);
  },

  async cfg_state(i) {
    const pos = posOf(i);
    const value = i.values[0];
    updateSlot(pos, (s) => {
      if (value.startsWith('cd:')) {
        const hours = Number(value.slice(3));
        s.state = 'cooldown';
        s.cooldownUntil = hours ? Date.now() + hours * 3_600_000 : null;
      } else {
        s.state = value;
        s.cooldownUntil = null;
      }
    });
    await i.update(await slotView(i, pos));
    refreshLater(i.client);
  },

  async cfg_edit(i) {
    const pos = posOf(i);
    const s = store.load().slots[pos];
    const modal = new ModalBuilder()
      .setCustomId(`cfg_modal_data:${pos}`)
      .setTitle(`Puesto #${pos + 1}`)
      .addComponents(
        textInput('name', 'Nombre (vacío = nombre del jugador)', s.name, { placeholder: 'Price' }),
        textInput('rank', 'Rango', s.rank, { placeholder: 'Leyenda, S+, 1500 pts...' }),
        textInput('host', 'Host', s.host, { placeholder: 'Paris, France' }),
        textInput('country', 'País (código o bandera)', s.country, { placeholder: 'ES, FR, MX o 🇪🇸', max: 20 }),
        textInput('image', 'Imagen (URL, opcional)', s.image, { placeholder: 'https://...', max: 500 }),
      );
    await i.showModal(modal);
  },

  async cfg_modal_data(i) {
    const pos = posOf(i);
    const get = (id) => i.fields.getTextInputValue(id).trim() || null;
    const image = get('image');
    if (image && !/^https?:\/\/\S+$/i.test(image)) {
      return i.reply(fail('La imagen debe ser un enlace que empiece por https://'));
    }
    updateSlot(pos, (s) => {
      s.name = get('name');
      s.rank = get('rank');
      s.host = get('host');
      s.country = get('country');
      s.image = image;
    });
    await i.update(await slotView(i, pos));
    refreshLater(i.client);
  },

  async cfg_up(i) {
    const pos = posOf(i);
    const data = store.load();
    [data.slots[pos - 1], data.slots[pos]] = [data.slots[pos], data.slots[pos - 1]];
    store.save(data);
    await i.update(await slotView(i, pos - 1));
    refreshLater(i.client);
  },

  async cfg_down(i) {
    const pos = posOf(i);
    const data = store.load();
    [data.slots[pos + 1], data.slots[pos]] = [data.slots[pos], data.slots[pos + 1]];
    store.save(data);
    await i.update(await slotView(i, pos + 1));
    refreshLater(i.client);
  },

  async cfg_clear(i) {
    const pos = posOf(i);
    const data = store.load();
    data.slots[pos] = store.emptySlot();
    store.save(data);
    await i.update(await slotView(i, pos));
    refreshLater(i.client);
  },

  async cfg_title(i) {
    const data = store.load();
    const modal = new ModalBuilder()
      .setCustomId('cfg_modal_title')
      .setTitle('Título del tablero')
      .addComponents(
        textInput('title', 'Título', data.title, { required: true, placeholder: 'REDLINE · Top 10' }),
        textInput('desc', 'Descripción (opcional)', data.description, {
          style: TextInputStyle.Paragraph,
          max: 500,
          placeholder: 'Texto debajo del título',
        }),
      );
    await i.showModal(modal);
  },

  async cfg_modal_title(i) {
    const data = store.load();
    data.title = i.fields.getTextInputValue('title').trim() || 'Clasificación';
    data.description = i.fields.getTextInputValue('desc').trim();
    store.save(data);
    await i.update(await mainView(i));
    refreshLater(i.client);
  },

  async cfg_publish(i) {
    await i.deferUpdate();
    const message = await i.channel.send(await buildBoard(i.client, { ping: true }));
    const data = store.load();
    data.published.push({ channelId: i.channel.id, messageId: message.id });
    store.save(data);
    await i.editReply(await mainView(i));
    await i.followUp(ok(`Tablero publicado en ${i.channel}. Se actualizará solo.`));
  },

  async cfg_rules(i) {
    await i.deferUpdate();
    const error = await postRules(i);
    await i.followUp(error ? fail(error) : ok('Reglamento publicado en este canal.'));
  },

  async cfg_clearall(i) {
    const embed = new EmbedBuilder()
      .setColor(0xff5c6c)
      .setDescription('⚠️ ¿Seguro que quieres **vaciar los 10 puestos**? No se puede deshacer.');
    await i.update({
      embeds: [embed],
      components: [
        row(
          btn('cfg_clearall_yes', 'Sí, vaciar todo', ButtonStyle.Danger, '🗑️'),
          btn('cfg_back', 'Cancelar', ButtonStyle.Secondary),
        ),
      ],
    });
  },

  async cfg_clearall_yes(i) {
    const data = store.load();
    data.slots = data.slots.map(() => store.emptySlot());
    store.save(data);
    await i.update(await mainView(i));
    refreshLater(i.client);
  },
};

// Every panel action is staff-only
const components = Object.fromEntries(
  Object.entries(handlers).map(([id, fn]) => [
    id,
    (i) =>
      i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
        ? fn(i)
        : i.reply(fail('Solo el staff puede usar este panel.')),
  ]),
);

module.exports = { commands: [command], components };
