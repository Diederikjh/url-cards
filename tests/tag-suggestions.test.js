const path = require('path');
const { pathToFileURL } = require('url');

let getTagSuggestions;

beforeAll(async () => {
  const modulePath = pathToFileURL(
    path.join(__dirname, '../public/js/rules/tagSuggestions.mjs')
  ).href;
  const utils = await import(modulePath);
  getTagSuggestions = utils.getTagSuggestions;
});

describe('tag suggestions rules', () => {
  test('returns matching tags in insertion order and respects limit', () => {
    const tagsById = new Map([
      ['t1', { id: 't1', name: 'Alpha', nameLower: 'alpha' }],
      ['t2', { id: 't2', name: 'Alpine', nameLower: 'alpine' }],
      ['t3', { id: 't3', name: 'Beta', nameLower: 'beta' }],
      ['t4', { id: 't4', name: 'Alpaca', nameLower: 'alpaca' }]
    ]);

    const results = getTagSuggestions('al', [], tagsById, 2);
    expect(results.map((tag) => tag.id)).toEqual(['t1', 't2']);
  });

  test('excludes selected tag ids', () => {
    const tagsById = new Map([
      ['t1', { id: 't1', name: 'Work', nameLower: 'work' }],
      ['t2', { id: 't2', name: 'Workout', nameLower: 'workout' }]
    ]);

    const results = getTagSuggestions('work', ['t1'], tagsById);
    expect(results.map((tag) => tag.id)).toEqual(['t2']);
  });

  test('normalizes query and handles missing nameLower', () => {
    const tagsById = new Map([
      ['t1', { id: 't1', name: 'Home' }],
      ['t2', { id: 't2', name: 'Office' }]
    ]);

    const results = getTagSuggestions('  HO', [], tagsById);
    expect(results.map((tag) => tag.id)).toEqual(['t1']);
  });
});
