/* Burson Floor — constants */

const CONST = {
  GAME_VERSION: '0.2.0',
  SAVE_KEY: 'burson_floor_settings_v1',

  TILE: 32,
  MAP_W: 22,
  MAP_H: 14,
  VIEW_W: 960,
  VIEW_H: 540,

  PLAYER_SPEED: 110,
  NPC_SPEED: 55,
  CAMERA_LERP: 0.14,

  DESK_W: 2,
  DESK_H: 1,

  DAY_START: 9 * 60,
  DAY_END: 18 * 60,
  SEC_PER_GAME_MIN: 1.0,

  FOCUS_MAX: 100,
  FOCUS_DECAY_PER_MIN: 0.35,
  COFFEE_FOCUS: 28,
  BLOOMBERG_FOCUS: 12,

  BUBBLE_LIFE: 3.4,
  AMBIENT_INTERVAL: {
    chill: 4.5,
    normal: 2.0,
    chaotic: 0.9,
  },

  TALK_RANGE: 44,
  SIT_RANGE: 28,
  PROP_RANGE: 40,

  COLORS: {
    carpet: '#3d4f63',
    carpetAlt: '#36485a',
    aisle: '#4a5d72',
    desk: '#8eb4d4',
    deskGrey: '#8a929c',
    deskX: '#6a7078',
    wall: '#2a3544',
    wood: '#6b5344',
    monitor: '#1a2030',
    plant: '#4a9a6a',
    coffee: '#5c4033',
    water: '#5eb1bf',
    bloomberg: '#ff6600',
    booth: '#6ec6ff',
  },
};
