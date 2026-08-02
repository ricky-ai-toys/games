'use strict';
const CREW = [
  {
    id: 'eurylochus', name: 'Eurylochus', role: 'First Mate', icon: '🧔',
    base: [
      'I trust the sea more than the gods, Captain. But I trust YOU most of all.',
      'The men grumble about home. Good. Grumbling means remembering.',
      'If you say anchor outside the harbor, we anchor outside. You were right. Again.',
    ],
    react: {
      memento: ['Another treasure for the chest. The lads say you collect stories. I say you collect hope.'],
      fail: ['We limped back, but we\'re still sailing. Every hero needs a day like today — just not two in a row.'],
      windsOpened: ['I was the one who whispered about gold. I was wrong, Captain. Forgive me.'],
      cattleAte: ['The hides walked, Captain. I saw the thunderbolt. I will never doubt you again.'],
      cyclopsDone: ['Nobody! HA! I will tell that tale in every port we reach.'],
      ithacaDone: ['Home. We\'re home. Twenty years, and you never stopped believing.'],
    },
  },
  {
    id: 'polites', name: 'Polites', role: 'Cheerful Sailor', icon: '😄',
    base: [
      'I found a starfish shaped like a coin. That\'s good luck, right?',
      'Sing with me, Captain! A shanty keeps the oars going.'],
    react: {
      memento: ['Ooh, let me see the treasure! I\'ll guard it with my life. Or at least my lunch.'],
      fail: ['We lost a game, not the war! The bards won\'t even remember this one.'],
      lotusFailed: ['One flower… how bad could it be? Oh. That bad. I\'ll stick to fig rolls.'],
      sirensDone: ['I heard NOTHING, thanks to the wax. You heard EVERYTHING?! You\'re braver than I am.'],
    },
  },
  {
    id: 'elpenor', name: 'Elpenor', role: 'Youngest Hand', icon: '🍇',
    base: [
      'I fell off Circe\'s roof once. The pigs caught me. True story!',
      'I\'m learning the stars. That one is the Bear. That one is… also a bear. It\'s a big sky.'],
    react: {
      memento: ['Is THAT the golden comb?! May I touch it? Just once?'],
      fail: ['Captain, my mum always said: fall down seven times, get up eight. Let\'s do the eight!'],
      underworldDone: ['They say my grave is on Aeaea. But here I am, sailing with you! Best ghost story ever.'],
    },
  },
  {
    id: 'lyra', name: 'Lyra', role: 'Ship\'s Singer', icon: '🎵',
    base: [
      'I\'ll sing you the song of the olive tree if you like. It\'s about a bed that never moves.',
      'A song with no chorus is like a ship with no sail.'],
    react: {
      memento: ['Treasure for the songs! Every item in that chest is a verse.'],
      fail: ['The gods laugh? Let them. I\'ll write a sad verse about it — those are the best ones.'],
      phaeaciaDone: ['Demodocus is my hero! I\'ve been practicing the hexameter clap all day.'],
    },
  },
  {
    id: 'midas', name: 'Midas', role: 'Lookout Boy', icon: '🔭',
    base: [
      'I saw a dolphin do a flip! That means good luck, right?',
      'From the crow\'s nest I can see three islands. Or two and a cloud. Hard to tell.'],
    react: {
      memento: ['The star of the island! Can I put it on the mast for a bit?'],
      fail: ['I kept the lookout while you fought! I only blinked once. Maybe twice.'],
      laestrygoniansDone: ['The boulders were HUGE. My lookout saved us! Well… your steering saved us. Both!'],
    },
  },
  {
    id: 'tycho', name: 'Old Tycho', role: 'Helmsman', icon: '🧭',
    base: [
      'I\'ve steered through storms the gods forgot to name. This sea is my old friend.',
      'The rudder remembers every turn we\'ve taken. Somewhere, it points home.'],
    react: {
      memento: ['I\'ve seen kings\' treasuries. This chest of yours holds better things: stories.'],
      fail: ['Even a good helmsman hits a rock now and then. The sea forgives the brave.'],
      scyllaDone: ['Six heads and a whirlpool, and the keel still whole! I\'ll tell my grandsons.'],
      calypsoDone: ['You built that raft with your own hands, Captain. I\'d have trusted it. I\'d have trusted YOU.'],
    },
  },
];

const BOONS = [
  { id: 'athena', name: 'Athena\'s Wisdom', icon: '🦉', cost: 15, desc: 'Goddess of wisdom watches over you: quiz answers are worth +1 Scholar Star.' },
  { id: 'hermes', name: 'Hermes\'s Sandals', icon: '👟', cost: 15, desc: 'Swift feet: every voyage leg costs 1 less food.' },
  { id: 'zeus', name: 'Zeus\'s Aegis', icon: '⛈️', cost: 20, desc: 'The storm shield: storm damage is halved (rounded down).' },
  { id: 'aphrodite', name: 'Aphrodite\'s Favor', icon: '💖', cost: 15, desc: 'Warm hearts: morale +2 whenever you arrive at an island.' },
];
