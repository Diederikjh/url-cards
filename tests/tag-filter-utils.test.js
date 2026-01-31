const path = require('path');
const { pathToFileURL } = require('url');

let buildAvailableTagOptions;
let cardMatchesTagFilter;

beforeAll(async () => {
  const modulePath = pathToFileURL(
    path.join(__dirname, '../public/js/utils/tagFilter.mjs')
  ).href;
  const utils = await import(modulePath);
  buildAvailableTagOptions = utils.buildAvailableTagOptions;
  cardMatchesTagFilter = utils.cardMatchesTagFilter;
});

describe('tag filter utils', () => {
  test('buildAvailableTagOptions returns sorted unique tags', () => {
    const tagMap = new Map([
      ['t2', { id: 't2', name: 'Personal', color: '#222' }],
      ['t3', { id: 't3', name: 'Archive', color: '#333' }]
    ]);
    const cards = [
      {
        tags: [{ id: 't1', name: 'Work', color: '#111' }],
        tagIds: ['t1']
      },
      {
        tagIds: ['t2', 't3']
      },
      {
        tags: [{ id: '', name: 'Ignore' }, { id: 't4' }]
      }
    ];

    const result = buildAvailableTagOptions(cards, tagMap);
    expect(result.map((tag) => tag.id)).toEqual(['t3', 't2', 't1']);
    expect(result.map((tag) => tag.name)).toEqual(['Archive', 'Personal', 'Work']);
  });

  test('cardMatchesTagFilter checks tagIds and tags', () => {
    expect(cardMatchesTagFilter(['t1'], [{ id: 't2' }], 't1')).toBe(true);
    expect(cardMatchesTagFilter([], [{ id: 't2' }], 't2')).toBe(true);
    expect(cardMatchesTagFilter(['t1'], [{ id: 't2' }], 't3')).toBe(false);
    expect(cardMatchesTagFilter(['t1'], [{ id: 't2' }], null)).toBe(true);
  });
});
