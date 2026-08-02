'use strict';
const EPITHETS = [
  { greek: 'polytropos', roman: 'polýtropos', meaning: 'the man of many turns — quick-witted, ever resourceful', line: '"Tell me, Muse, of the man of many turns…" — the very first words of the Odyssey', icon: '🌀', hero: true },
  { greek: 'rhododaktylos Eos', roman: 'rododáktylos Eos', meaning: 'rosy-fingered Dawn — the sunrise, as Homer always called it', line: 'Homer never just says "morning" — he paints it: fingers of pink light reaching over the sea', icon: '🌅' },
  { greek: 'oinops pontos', roman: 'oînops póntos', meaning: 'the wine-dark sea — the ocean in its deep, glinting color', line: 'Scholars argue: wine-red? dark blue? Homer had one word for both', icon: '🍷' },
  { greek: 'dios Odysseus', roman: 'díos Odysseús', meaning: 'godlike Odysseus — heroes get divine epithets', line: 'Even when he is disguised as a beggar, the poet still calls him godlike', icon: '⭐', hero: true },
  { greek: 'polymētis', roman: 'polýmētis', meaning: 'of many counsels — Odysseus, the man of clever plans', line: 'He wins with his head, not his fists — that is the whole point of the poem', icon: '🧠', hero: true },
  { greek: 'echephron', roman: 'ekhépfrōn', meaning: 'wise-hearted — Penelope, the faithful and clever queen', line: 'Penelope has her own epithet: she thinks before she acts', icon: '🕯️' },
  { greek: 'nephelēgereta Zeus', roman: 'nephelēgeréta Zeús', meaning: 'Zeus the cloud-gatherer — the sky god collects clouds like a shepherd', line: 'Greek gods live in the weather: thunder, rain, lightning', icon: '⛈️' },
  { greek: 'glaukōpis Athēnē', roman: 'glaukṓpis Athḗnē', meaning: 'grey-eyed (owl-eyed) Athena — the goddess of wisdom', line: 'Her bird is the owl, whose eyes glow in the dark like wisdom itself', icon: '🦉' },
  { greek: 'anosios', roman: 'anósios', meaning: 'unholy — what the Cyclops is, for breaking the rules of guest-friendship', line: 'The poem\'s worst insult is not "ugly" or "strong" — it is "unholy"', icon: '⚖️' },
  { greek: 'argyrotoxos', roman: 'argyrótoxos', meaning: 'silver-bowed — Apollo, god of archery and song', line: 'The bow is sacred: only the best may string it', icon: '🏹' },
  { greek: 'brodiepēs', roman: 'brodiepḗs', meaning: 'sweet-voiced — how bards and Sirens are described', line: 'The Sirens sing "sweetly" — that is exactly why they are dangerous', icon: '🎶' },
  { greek: 'philotēs', roman: 'philótēs', meaning: 'love and friendship — the bond that holds people together', line: 'A Greek hero\'s greatest treasure: the people he loves', icon: '❤️' },
  { greek: 'thalamos', roman: 'thálamos', meaning: 'the inner chamber — the heart of the house, where the marriage bed stands', line: 'Penelope\'s test is about the bed — and about the heart of the house', icon: '🏛️' },
  { greek: 'hērōs', roman: 'hērōs', meaning: 'hero — originally just a great man of the past, not a superhero', line: 'Ancient heroes could be clever, foolish, brave and afraid — like us', icon: '🛡️' },
  { greek: 'aoidos', roman: 'aoidós', meaning: 'singer — the bard who carries the poem in his memory', line: 'The Odyssey was sung from memory for 400 years before it was written down', icon: '🎤' },
  { greek: 'xenos', roman: 'xénos', meaning: 'guest and stranger — one word for both, because guests are sacred', line: 'Zeus Xenios watched over guests. Hurt a guest and you hurt Zeus himself', icon: '🤝' },
];
