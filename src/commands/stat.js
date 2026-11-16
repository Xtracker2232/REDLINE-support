const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('../store');
const { buildBoard, refreshBoards, slotEmbed } = require('../board');
const { ok, fail } = require('../utils');

const STATE_CHOICES = [
  { name: '🟢 Sin cooldown', value: 'free' },
  { name: '🟡 En cooldown', value: 'cooldown' },
  { name: '🔴 No disponible', value: 'busy' },
];

// Text option: undefined = not given (keep), "-" = clear, anything else = new value
function textOption(i, name, max = 100) {
  const v = i.options.getString(name);
  if (v === null) return undefined;
  return v.trim() === '-' ? null : v.trim().slice(0, max);
}

const posOption = (o, name = 'posicion', desc = 'Posición (1-10)') =>
  o.setName(name).setDescription(desc).setRequired(true).setMinValue(1).setMaxValue(store.SIZE);

// /stat — everyone can look at the board
const stat = {
  data: new SlashCommandBuilder()
    .setName('stat')
    .setDescription('Muestra la clasificación')
    .addIntegerOption((o) =>
      o.setName('posicion').setDescription('Ver solo una posición (1-10)').setMinValue(1).setMaxValue(store.SIZE),
    ),
  async execute(i) {
    await i.deferReply();
    const pos = i.options.getInteger('posicion');
    if (pos) {
      const data = store.load();
      const embed = await slotEmbed(i.client, data.slots[pos - 1], pos - 1);
      return i.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
    await i.editReply(await buildBoard(i.client));
  },
};

// /stat-config — staff only
const statConfig = {
  data: new SlashCommandBuilder()
    .setName('stat-config')
    .setDescription('Configura la clasificación')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('editar')
        .setDescription('Edita una posición (escribe "-" para borrar un campo)')
        .addIntegerOption((o) => posOption(o))
        .addUserOption((o) => o.setName('jugador').setDescription('Miembro de Discord'))
        .addStringOption((o) => o.setName('nombre').setDescription('Nombre mostrado (por defecto: el del jugador)'))
        .addStringOption((o) => o.setName('rango').setDescription('Rango, ej: Leyenda, S+, 1500 pts'))
        .addStringOption((o) => o.setName('host').setDescription('Ubicación, ej: Paris, France'))
        .addStringOption((o) => o.setName('estado').setDescription('Estado').addChoices(...STATE_CHOICES))
        .addNumberOption((o) =>
          o
            .setName('cooldown_horas')
            .setDescription('Pone En cooldown durante X horas (se quita solo)')
            .setMinValue(0.1)
            .setMaxValue(720),
        )
        .addStringOption((o) => o.setName('pais').setDescription('Código de país (ES, FR, MX...) o emoji de bandera'))
        .addStringOption((o) => o.setName('imagen').setDescription('URL de una imagen (https://...)')),
    )
    .addSubcommand((s) =>
      s
        .setName('quitar')
        .setDescription('Vacía una posición')
        .addIntegerOption((o) => posOption(o)),
    )
    .addSubcommand((s) =>
      s
        .setName('mover')
        .setDescription('Intercambia dos posiciones')
        .addIntegerOption((o) => posOption(o, 'de', 'Posición a mover'))
        .addIntegerOption((o) => posOption(o, 'a', 'Nueva posición')),
    )
    .addSubcommand((s) =>
      s
        .setName('titulo')
        .setDescription('Cambia el título y la descripción del tablero')
        .addStringOption((o) => o.setName('titulo').setDescription('Título').setRequired(true).setMaxLength(100))
        .addStringOption((o) =>
          o.setName('descripcion').setDescription('Texto debajo del título ("-" para quitar)').setMaxLength(500),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('publicar')
        .setDescription('Publica el tablero en un canal (se actualiza solo)')
        .addChannelOption((o) =>
          o
            .setName('canal')
            .setDescription('Canal (por defecto: este)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        ),
    )
    .addSubcommand((s) => s.setName('vaciar').setDescription('Vacía TODAS las posiciones')),

  async execute(i) {
    const sub = i.options.getSubcommand();
    const data = store.load();

    if (sub === 'editar') {
      const pos = i.options.getInteger('posicion');
      const slot = data.slots[pos - 1];
      const user = i.options.getUser('jugador');
      if (user) slot.userId = user.id;

      for (const [opt, key] of [
        ['nombre', 'name'],
        ['rango', 'rank'],
        ['host', 'host'],
        ['pais', 'country'],
      ]) {
        const v = textOption(i, opt);
        if (v !== undefined) slot[key] = v;
      }

      const image = textOption(i, 'imagen', 500);
      if (image !== undefined) {
        if (image && !/^https?:\/\/\S+$/i.test(image)) {
          return i.reply(fail('La imagen debe ser un enlace que empiece por https://'));
        }
        slot.image = image;
      }

      const state = i.options.getString('estado');
      const hours = i.options.getNumber('cooldown_horas');
      if (state) {
        slot.state = state;
        slot.cooldownUntil = null;
      }
      if (hours) {
        slot.state = 'cooldown';
        slot.cooldownUntil = Date.now() + hours * 3_600_000;
      }

      store.save(data);
      const reply = ok(`Posición **#${pos}** actualizada:`);
      reply.embeds.push(await slotEmbed(i.client, slot, pos - 1));
      reply.allowedMentions = { parse: [] };
      await i.reply(reply);
    } else if (sub === 'quitar') {
      const pos = i.options.getInteger('posicion');
      data.slots[pos - 1] = store.emptySlot();
      store.save(data);
      await i.reply(ok(`Posición **#${pos}** vaciada.`));
    } else if (sub === 'mover') {
      const from = i.options.getInteger('de') - 1;
      const to = i.options.getInteger('a') - 1;
      [data.slots[from], data.slots[to]] = [data.slots[to], data.slots[from]];
      store.save(data);
      await i.reply(ok(`Posiciones **#${from + 1}** y **#${to + 1}** intercambiadas.`));
    } else if (sub === 'titulo') {
      data.title = i.options.getString('titulo');
      const desc = textOption(i, 'descripcion', 500);
      if (desc !== undefined) data.description = desc ?? '';
      store.save(data);
      await i.reply(ok('Título actualizado.'));
    } else if (sub === 'publicar') {
      const channel = i.options.getChannel('canal') ?? i.channel;
      await i.deferReply({ ephemeral: true });
      const message = await channel.send(await buildBoard(i.client));
      data.published.push({ channelId: channel.id, messageId: message.id });
      store.save(data);
      return i.editReply(ok(`Tablero publicado en ${channel}. Se actualizará automáticamente.`));
    } else if (sub === 'vaciar') {
      data.slots = data.slots.map(() => store.emptySlot());
      store.save(data);
      await i.reply(ok('Todas las posiciones han sido vaciadas.'));
    }

    await refreshBoards(i.client);
  },
};

module.exports = [stat, statConfig];
