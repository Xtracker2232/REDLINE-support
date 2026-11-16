const { EmbedBuilder } = require('discord.js');

// Private (ephemeral) replies
const ok = (text) => ({ embeds: [new EmbedBuilder().setColor(0x3ddc84).setDescription(`✅ ${text}`)], ephemeral: true });
const fail = (text) => ({ embeds: [new EmbedBuilder().setColor(0xff5c6c).setDescription(`❌ ${text}`)], ephemeral: true });

module.exports = { ok, fail };
