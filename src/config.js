require('dotenv').config();
const path = require('node:path');

const env = process.env;

module.exports = {
  // Remove spaces / quotes that often get pasted with the token
  token: (env.DISCORD_TOKEN || '').trim().replace(/^["']|["']$/g, ''),
  guildId: (env.GUILD_ID || '').trim(),
  rulesRoleId: (env.RULES_ROLE_ID || '1571266194617667614').trim(),
  dataDir: env.DATA_DIR || path.join(__dirname, '..', 'data'),
  // Line emojis of each board entry (custom server emojis or plain characters)
  emojis: {
    top: env.EMOJI_TOP || '┏',
    middle: env.EMOJI_MIDDLE || '┣',
    bottom: env.EMOJI_BOTTOM || '┗',
  },
  color: 0x5865f2,
};
