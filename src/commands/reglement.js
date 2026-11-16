const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config');
const { ok, fail } = require('../utils');

const RULES = [
  '**1. Respeto ante todo**\nTrata a todos con respeto. Nada de insultos, acoso, racismo ni discriminación.',
  '**2. Nada de spam**\nNo inundes los canales, no abuses de las mayúsculas ni de las menciones.',
  '**3. Sin publicidad**\nProhibido enviar invitaciones a otros servidores o promocionarte sin permiso del staff.',
  '**4. Contenido apropiado**\nNada de contenido NSFW, gore, violento o que pueda incomodar a otros.',
  '**5. Juego limpio**\nProhibido usar hacks, exploits o cualquier tipo de trampa, dentro y fuera del juego.',
  '**6. Nada de estafas**\nNo intentes engañar a otros miembros (tradeos, cuentas, Robux...). Tolerancia cero.',
  '**7. Usa los canales correctos**\nCada tema en su canal. Lee la descripción de los canales antes de escribir.',
  '**8. Normas de Discord y Roblox**\nSe aplican los Términos de Servicio de Discord y las Normas de la Comunidad de Roblox.',
  '**9. Escucha al staff**\nLas decisiones del staff son definitivas. Si tienes un problema, habla con un miembro del staff en privado.',
].join('\n\n');

// Posts the rules in the interaction's channel. Returns an error text, or null if OK.
async function postRules(i) {
  const role = i.guild.roles.cache.get(config.rulesRoleId);
  if (!role) return `El rol \`${config.rulesRoleId}\` no existe en este servidor. Revisa RULES_ROLE_ID.`;
  if (role.position >= i.guild.members.me.roles.highest.position) {
    return `Mi rol debe estar **por encima** de ${role} en Ajustes del servidor → Roles, si no, no puedo darlo.`;
  }
  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setAuthor({ name: i.guild.name, iconURL: i.guild.iconURL() ?? undefined })
    .setTitle('📜 Reglamento del servidor')
    .setDescription(RULES)
    .setFooter({ text: 'Al pulsar el botón aceptas el reglamento y obtienes acceso al servidor.' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rules_accept').setLabel('Acepto el reglamento').setEmoji('✅').setStyle(ButtonStyle.Success),
  );
  await i.channel.send({ embeds: [embed], components: [row] });
  return null;
}

const reglement = {
  data: new SlashCommandBuilder()
    .setName('reglement')
    .setDescription('Publica el reglamento con el botón para aceptarlo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(i) {
    const error = await postRules(i);
    await i.reply(error ? fail(error) : ok('Reglamento publicado.'));
  },
};

const components = {
  async rules_accept(i) {
    const role = i.guild.roles.cache.get(config.rulesRoleId);
    if (!role) return i.reply(fail('Este rol ya no existe. Avisa a un miembro del staff.'));
    if (i.member.roles.cache.has(role.id)) return i.reply(ok('Ya has aceptado el reglamento. ¡Diviértete! 🎮'));
    try {
      await i.member.roles.add(role, 'Aceptó el reglamento');
    } catch (err) {
      console.error('Could not give rules role:', err.message);
      return i.reply(fail('No he podido darte el rol. Avisa a un miembro del staff.'));
    }
    await i.reply(ok(`¡Gracias por aceptar el reglamento! Ahora tienes el rol ${role}. ¡Bienvenido! 🎉`));
  },
};

module.exports = { commands: [reglement], components, postRules };
