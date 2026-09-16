export const funFacts = [
  'A group of flamingos is called a flamboyance.',
  'Octopuses have three hearts.',
  'Honey never spoils.',
  'Bananas are berries, but strawberries are not.',
  'There are more possible chess games than atoms in the observable universe.',
  'Wombat poop is cube-shaped.',
  'A day on Venus is longer than a year on Venus.',
  'Sharks existed before dinosaurs.',
  'The Eiffel Tower grows taller in the summer because of heat expansion.',
  'Cows have best friends and can get stressed when separated.',
];

export const botMoods = [
  'Vexon is feeling playful today.',
  'Vexon is in a mysterious mood.',
  'Vexon is ready to help.',
  'Vexon is feeling extra chaotic today.',
  'Vexon has a dramatic little sparkle in the code.',
  'Vexon is vibing with the server tonight.',
];

export const secretReplies = [
  'I heard the server whispers are all good vibes.',
  'There is a tiny code ghost in the bot files.',
  'The secret is... even bots enjoy a good snack break.',
  'You found the hidden layer. The answer is: be kind.',
  'This is just a harmless little bot sparkle.',
  'The whisper says the server is awesome.',
];

export const quotes = [
  'The best way to predict the future is to build it. - Alan Kay',
  'Good things happen to those who hustle. - Anaïs Nin',
  'One small step for a bot, one giant leap for server vibes.',
  'A little chaos is sometimes the spark that makes things fun.',
  'You don’t need to be loud to be memorable.',
  'The internet is better with a little personality.',
];

export const memes = [
  'When the bot actually works on the first try: https://example.com',
  'Me: “I’ll be productive.” Also me: “Let me just open the server for five minutes.”',
  'The server is running smoothly… for now.',
  'The code is 90% coffee and 10% confidence.',
  'It works in my head. The rest is just deployment magic.',
];

export const askResponses = [
  'Yes, absolutely.',
  'I would lean toward yes.',
  'Probably not this time.',
  'Ask again later when the cosmic pointers align.',
  'Definitely. The signs point to a green light.',
  'Not a chance, my friend.',
  'It is looking promising.',
  'The universe says give it a try.',
];

export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollDice(sides = 6) {
  return Math.floor(Math.random() * sides) + 1;
}

export function getLuckyNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

export function coinFlip() {
  return Math.random() < 0.5 ? 'Heads' : 'Tails';
}

export function buildTextResponse(title, lines = []) {
  const content = lines.length ? lines.join('\n') : 'No details available.';
  return `${title}\n${content}`;
}
