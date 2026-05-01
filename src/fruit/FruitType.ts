export interface FruitType {
    name: string;
    /** Outer skin / rind color */
    color: string;
    /** Darker shade for gradient on skin */
    colorDark: string;
    /** Inner flesh color */
    innerColor: string;
    /** Lighter flesh highlight */
    innerLight: string;
    /** Seed / detail color */
    seedColor: string;
    radius: number;
    segments: number;
    points: number;
}

export const FRUIT_TYPES: FruitType[] = [
    {
        name: 'watermelon',
        color: '#2ecc40', colorDark: '#1a8a2d',
        innerColor: '#ff4136', innerLight: '#ff6b63',
        seedColor: '#1a1a1a',
        radius: 50, segments: 14, points: 3,
    },
    {
        name: 'orange',
        color: '#ff851b', colorDark: '#d46a00',
        innerColor: '#ffaa33', innerLight: '#ffcc66',
        seedColor: '#fff5e0',
        radius: 38, segments: 12, points: 1,
    },
    {
        name: 'apple',
        color: '#e2272e', colorDark: '#a31d22',
        innerColor: '#fffdd0', innerLight: '#ffffff',
        seedColor: '#5c3a1e',
        radius: 36, segments: 12, points: 1,
    },
    {
        name: 'kiwi',
        color: '#6b4226', colorDark: '#4a2e1a',
        innerColor: '#8fce00', innerLight: '#b5e655',
        seedColor: '#1a1a1a',
        radius: 32, segments: 10, points: 1,
    },
    {
        name: 'grape',
        color: '#7b2d8e', colorDark: '#551f63',
        innerColor: '#c480d4', innerLight: '#e0b0ec',
        seedColor: '#3d1548',
        radius: 28, segments: 10, points: 2,
    },
    {
        name: 'lemon',
        color: '#f5e642', colorDark: '#d4c520',
        innerColor: '#f8f4a0', innerLight: '#fdfde0',
        seedColor: '#e8e070',
        radius: 32, segments: 10, points: 1,
    },
];
