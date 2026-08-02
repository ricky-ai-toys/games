'use strict';
const VOYAGE_DATA = {
  start: { name: 'Troy', note: 'The war is over. The fleet sets sail for home.' },
  nodes: [
    { id: 'calypso', x: 470, y: 150, name: 'Ogygia', note: 'Calypso\'s hidden isle. Somewhere in the western sea.' },
    { id: 'lotus', x: 290, y: 330, name: 'Land of the Lotus', note: 'A gentle coast of drowsy flowers — north Africa, some say.' },
    { id: 'cyclops', x: 450, y: 380, name: 'Cyclopes\' Isle', note: 'Caves, sheep, and one very big eye. Perhaps Sicily!' },
    { id: 'aeolus', x: 650, y: 300, name: 'Aeolia', note: 'The floating island of the winds. Home of the Etesian breezes.' },
    { id: 'laestrygonians', x: 790, y: 170, name: 'Telepylos', note: 'The giant\'s harbor — a deep, walled port. Do not anchor inside.' },
    { id: 'circe', x: 700, y: 420, name: 'Aeaea', note: 'Circe\'s witch-isle, between Italy and Greece.' },
    { id: 'underworld', x: 250, y: 450, name: 'The House of the Dead', note: 'Beyond the edge of the world, where the rivers of Hades run.' },
    { id: 'sirens', x: 500, y: 240, name: 'The Sirens\' Rocks', note: 'A rocky isle of sweet, deadly song.' },
    { id: 'scylla', x: 820, y: 340, name: 'The Strait', note: 'Scylla\'s cliff and Charybdis\'s whirlpool — the Strait of Messina.' },
    { id: 'helios', x: 600, y: 435, name: 'Thrinacia', note: 'Three-cornered Sicily — home of the sun god\'s cattle.' },
    { id: 'phaeacia', x: 365, y: 160, name: 'Scheria', note: 'The gracious Phaeacians — perhaps Corfu, the Emerald Isle.' },
    { id: 'ithaca', x: 150, y: 220, name: 'Ithaca', note: 'Home. Rocky, small, and the best island in the world.' },
  ],
  detours: [
    { id: 'cove', x: 720, y: 60, name: 'Amphitrite\'s Cove', after: 'circe', note: 'A hidden cove of calm water. Trade food for hull repairs.' },
    { id: 'muses', x: 100, y: 90, name: 'The Muses\' Isle', after: 'sirens', note: 'The Muses love a good story. Offer food, earn glory.' },
  ],
  events: [
    { id: 'storm', name: 'A Storm Rises!', text: 'Poseidon stirs the sea! Dark waves tower over the ship.', a: { label: 'Ride it out', effect: 'storm' }, b: { label: 'Reef the sails', effect: 'reef' } },
    { id: 'dolphins', name: 'Dolphins!', text: 'A pod of dolphins leaps beside the ship, chattering happily.', a: { label: 'Follow them', effect: 'morale' }, b: { label: 'Keep course', effect: 'none' } },
    { id: 'whale', name: 'A Whale Crosses', text: 'A gentle giant surfaces right ahead. The crew gasps.', a: { label: 'Slow and wave', effect: 'morale2' }, b: { label: 'Steer around', effect: 'food' } },
    { id: 'trade', name: 'A Trading Ship', text: 'A merchant ship offers figs and oil — for a price.', a: { label: 'Trade 3 food → +3 morale', effect: 'trade1' }, b: { label: 'Wave them on', effect: 'none' } },
    { id: 'fog', name: 'Sea Fog', text: 'Thick fog swallows the ship. The crew rows blind.', a: { label: 'Blow the horn', effect: 'fogA' }, b: { label: 'Drift and wait', effect: 'fogB' } },
  ],
};
