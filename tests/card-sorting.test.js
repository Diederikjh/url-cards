const path = require('path');
const { pathToFileURL } = require('url');

let compareCards;
let rankForSort;
let buildRankUpdatesForSort;
let buildRankUpdatesForOrder;

beforeAll(async () => {
  const modulePath = pathToFileURL(
    path.join(__dirname, '../public/js/rules/cardSorting.mjs')
  ).href;
  const utils = await import(modulePath);
  compareCards = utils.compareCards;
  rankForSort = utils.rankForSort;
  buildRankUpdatesForSort = utils.buildRankUpdatesForSort;
  buildRankUpdatesForOrder = utils.buildRankUpdatesForOrder;
});

function makeCard(id, title, millis) {
  return {
    id,
    title,
    createdAt: { toMillis: () => millis }
  };
}

describe('card sorting rules', () => {
  test('compareCards orders by created date', () => {
    const older = makeCard('a', 'Older', 1000);
    const newer = makeCard('b', 'Newer', 2000);
    const createdDesc = [older, newer].sort((a, b) => compareCards(a, b, 'created_desc'));
    const createdAsc = [older, newer].sort((a, b) => compareCards(a, b, 'created_asc'));
    expect(createdDesc.map((card) => card.id)).toEqual(['b', 'a']);
    expect(createdAsc.map((card) => card.id)).toEqual(['a', 'b']);
  });

  test('compareCards orders by name', () => {
    const alpha = makeCard('a', 'Alpha', 1000);
    const beta = makeCard('b', 'Beta', 1000);
    const nameAsc = [beta, alpha].sort((a, b) => compareCards(a, b, 'name_asc'));
    const nameDesc = [alpha, beta].sort((a, b) => compareCards(a, b, 'name_desc'));
    expect(nameAsc.map((card) => card.id)).toEqual(['a', 'b']);
    expect(nameDesc.map((card) => card.id)).toEqual(['b', 'a']);
  });

  test('rankForSort uses created timestamps when appropriate', () => {
    const card = makeCard('c', 'Card', 1234);
    expect(rankForSort(card, 2, 'created_desc')).toBe(-1234);
    expect(rankForSort(card, 2, 'created_asc')).toBe(1234);
    expect(rankForSort(card, 2, 'name_asc')).toBe(2000);
  });

  test('buildRankUpdatesForSort returns id->rank mapping', () => {
    const cards = [makeCard('a', 'A', 10), makeCard('b', 'B', 20)];
    const updates = buildRankUpdatesForSort(cards, 'created_desc');
    expect(updates).toEqual({ a: -10, b: -20 });
  });

  test('buildRankUpdatesForOrder returns sequential ranks', () => {
    const updates = buildRankUpdatesForOrder(['x', 'y', 'z']);
    expect(updates).toEqual({ x: 0, y: 1000, z: 2000 });
  });
});
