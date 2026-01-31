const path = require('path');
const { pathToFileURL } = require('url');

let computeTagUsageCounts;

beforeAll(async () => {
  const modulePath = pathToFileURL(
    path.join(__dirname, '../public/js/utils/tagUsage.mjs')
  ).href;
  const utils = await import(modulePath);
  computeTagUsageCounts = utils.computeTagUsageCounts;
});

function mapToSortedEntries(map) {
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

describe('tag usage utils', () => {
  test('computeTagUsageCounts prefers tagIds over tags', () => {
    const cards = [
      { tagIds: ['t1', 't2'], tags: [{ id: 't1' }, { id: 't2' }] },
      { tags: [{ id: 't2' }, { id: 't3' }] },
      { tagIds: ['t2', 't3'] },
      { tagIds: [] },
      { tags: [{ id: 't4' }] }
    ];

    const result = computeTagUsageCounts(cards);
    expect(mapToSortedEntries(result)).toEqual([
      ['t1', 1],
      ['t2', 3],
      ['t3', 2],
      ['t4', 1]
    ]);
  });

  test('computeTagUsageCounts ignores invalid entries', () => {
    const cards = [
      { tagIds: ['t1', null, ''] },
      { tags: [{ id: '' }, { id: null }, {}] },
      {}
    ];

    const result = computeTagUsageCounts(cards);
    expect(mapToSortedEntries(result)).toEqual([['t1', 1]]);
  });
});
