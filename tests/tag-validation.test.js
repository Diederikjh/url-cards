const path = require('path');
const { pathToFileURL } = require('url');

let normalizeTagName;
let isTagNameValid;
let isTagNameDuplicate;

beforeAll(async () => {
  const modulePath = pathToFileURL(
    path.join(__dirname, '../public/js/rules/tagValidation.mjs')
  ).href;
  const utils = await import(modulePath);
  normalizeTagName = utils.normalizeTagName;
  isTagNameValid = utils.isTagNameValid;
  isTagNameDuplicate = utils.isTagNameDuplicate;
});

describe('tag validation rules', () => {
  test('normalizeTagName trims and handles non-strings', () => {
    expect(normalizeTagName('  hello  ')).toBe('hello');
    expect(normalizeTagName('')).toBe('');
    expect(normalizeTagName(null)).toBe('');
  });

  test('isTagNameValid enforces length', () => {
    expect(isTagNameValid('a')).toBe(false);
    expect(isTagNameValid('ab')).toBe(true);
    expect(isTagNameValid('a'.repeat(40))).toBe(true);
    expect(isTagNameValid('a'.repeat(41))).toBe(false);
  });

  test('isTagNameDuplicate respects excludeId', () => {
    const tags = [
      { id: 't1', nameLower: 'work' },
      { id: 't2', nameLower: 'home' }
    ];
    expect(isTagNameDuplicate('work', tags)).toBe(true);
    expect(isTagNameDuplicate('work', tags, 't1')).toBe(false);
    expect(isTagNameDuplicate('other', tags)).toBe(false);
  });
});
