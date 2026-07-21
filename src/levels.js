import { ROOM_DATA } from './room-data.js';

export const COLS = 18;
export const ROWS = 11;

export const CHAPTERS = [
  { name: 'Brass Beginnings', place: 'The Clockwork Foyer', theme: 'gear', accent: '#ffd35a', sky: '#27335f', floor: '#5271a8', music: 'march', story: 'Wake the old machines and learn the Vault\'s rules.' },
  { name: 'The Overgrown Wing', place: 'Mosslight Conservatory', theme: 'garden', accent: '#78f0a4', sky: '#183f4b', floor: '#4e9b79', music: 'grove', story: 'Vines have swallowed the museum\'s living exhibits.' },
  { name: 'Cold Calculations', place: 'The Glacier Gallery', theme: 'ice', accent: '#8ff3ff', sky: '#23386d', floor: '#62b9d3', music: 'crystal', story: 'Every step carries farther than Pip expects.' },
  { name: 'Trial by Fire', place: 'The Ember Foundry', theme: 'foundry', accent: '#ff9a4d', sky: '#4b2032', floor: '#9d4a48', music: 'forge', story: 'Baron Null\'s furnaces turn relics into war machines.' },
  { name: 'Thunder in a Bottle', place: 'The Storm Laboratory', theme: 'storm', accent: '#b68cff', sky: '#2d245d', floor: '#6260b4', music: 'voltage', story: 'Teleport coils crackle between impossible rooms.' },
  { name: 'The Whispering Stacks', place: 'The Infinite Library', theme: 'library', accent: '#ffcf91', sky: '#382840', floor: '#8b5f6d', music: 'mystery', story: 'Books remember every visitor—and some bite back.' },
  { name: 'One Small Pip', place: 'The Moonlit Orrery', theme: 'moon', accent: '#e5e6ff', sky: '#171a3c', floor: '#5b5f8f', music: 'orbit', story: 'Ghost-light and starless gaps test Pip\'s nerve.' },
  { name: 'Pressure Below', place: 'The Sunken Aquarium', theme: 'aquarium', accent: '#51e5d4', sky: '#123a52', floor: '#357d91', music: 'tide', story: 'Ancient currents still obey the Vault\'s brass pumps.' },
  { name: 'Null\'s Last Guard', place: 'The Obsidian Citadel', theme: 'citadel', accent: '#ff6d7a', sky: '#2a1934', floor: '#65406c', music: 'siege', story: 'Every machine in the museum converges on Pip.' },
  { name: 'Heart of the Vault', place: 'The Prism Core', theme: 'prism', accent: '#fff27a', sky: '#2b2864', floor: '#785ec0', music: 'finale', story: 'Restore the Prism Heart before the whole Vault folds.' },
];

const TILE_BY_CHAR = Object.freeze({
  '#':'wall', '.':'floor', '~':'hazard', '^':'spikes', i:'ice',
  '>':'conveyorRight', '<':'conveyorLeft', u:'conveyorUp', d:'conveyorDown',
  f:'fragile', a:'teleportA', b:'teleportB',
});

function decodeMap(rows) {
  if (!Array.isArray(rows) || rows.length !== ROWS) throw new Error('Invalid authored room height.');
  return rows.map((row, y) => {
    if (row.length !== COLS) throw new Error(`Invalid authored room width at row ${y}.`);
    return [...row].map(char => TILE_BY_CHAR[char] ?? 'floor');
  });
}

function copyEntities(entities) {
  return entities.map(entity => ({...entity}));
}

export function buildLevel(index) {
  const safeIndex = Math.max(0, Math.min(ROOM_DATA.length - 1, Number(index) || 0));
  const room = ROOM_DATA[safeIndex];
  const theme = CHAPTERS[room.chapter];
  return {
    index: safeIndex,
    number: room.number,
    chapter: room.chapter,
    stage: room.stage,
    name: room.name,
    chapterName: theme.name,
    place: theme.place,
    theme,
    story: theme.story,
    grid: decodeMap(room.map),
    entities: copyEntities(room.entities),
    par: room.par,
    optimalTurns: room.optimalTurns,
    complexity: room.complexity,
    features: [...room.features],
    designNote: room.designNote,
    intendedSolution: room.solution,
    hint: room.hint ?? room.designNote,
  };
}

export const LEVELS = ROOM_DATA.map((room, index) => ({
  index,
  number: room.number,
  chapter: room.chapter,
  stage: room.stage,
  name: room.name,
  chapterName: CHAPTERS[room.chapter].name,
  theme: CHAPTERS[room.chapter],
  par: room.par,
  optimalTurns: room.optimalTurns,
  complexity: room.complexity,
  features: [...room.features],
  designNote: room.designNote,
}));
