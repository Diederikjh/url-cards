export const TAG_COLOR_PALETTE = [
    '#fbe4e6',
    '#ffe7d6',
    '#fff1cc',
    '#f6f1c7',
    '#e6f2cc',
    '#d9f7e6',
    '#d4f1f4',
    '#dbeafe',
    '#e3d7ff',
    '#f3d9fa',
    '#fde2f2',
    '#f7d9e3',
    '#f7e3da',
    '#f5f0e1',
    '#e9f0f8',
    '#e6e8f5',
    '#f0e6ff',
    '#dfe9f3',
    '#e8f5e9',
    '#fff3e0'
];

export function pickRandomTagColor() {
    return TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)];
}

export function getReadableTextColor(hexColor) {
    if (!hexColor || typeof hexColor !== 'string') return '#1f2933';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#1f2933';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.6 ? '#1f2933' : '#f9fafb';
}
