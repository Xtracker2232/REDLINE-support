const { SlashCommandBuilder } = require('discord.js');
const store = require('../store');
const { buildBoard, slotEmbed } = require('../board');

// /stat — everyone can look at the board (configure it with /config)
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
      const embed = await slotEmbed(i.client, store.load().slots[pos - 1], pos - 1);
      return i.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
    await i.editReply(await buildBoard(i.client));
  },
};

module.exports = { commands: [stat] };
