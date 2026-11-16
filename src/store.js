// Saves the board in data/board.json
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const SIZE = 10;
const file = path.join(config.dataDir, 'board.json');

const emptySlot = () => ({
  userId: null,
  name: null,
  rank: null,
  host: null,
  state: 'free', // free | cooldown | busy
  cooldownUntil: null,
  country: null,
  image: null,
});

function load() {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  return {
    title: data.title ?? 'Clasificación',
    description: data.description ?? '',
    slots: Array.from({ length: SIZE }, (_, n) => ({ ...emptySlot(), ...(data.slots?.[n] ?? {}) })),
    published: data.published ?? [], // [{ channelId, messageId }]
  };
}

function save(data) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = { load, save, emptySlot, SIZE };
