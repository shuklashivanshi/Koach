// Learning Pattern Test content (LPT-01): two parallel forms so a retest never repeats items.
// UPSC-flavoured, matched in difficulty, and free of any person, institute or platform names.

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export interface EventCard {
  label: string;
  year: number;
}

export interface Form {
  id: 'A' | 'B';
  /** Map Pins: shown for 20s on an India map, then placed back. */
  places: Place[];
  /** Pattern Grid: 5×5 cells (0..24); each sequence is one round, growing in length. */
  grid: number[][];
  /** Listen & Recall: lists read aloud once, growing in length. */
  lists: string[][];
  /** Read & Write Back: shown for 60s; recall is scored against the idea units. */
  passage: { text: string; ideaUnits: string[] };
  /** Arrange: shuffled cards to put in chronological order. */
  events: EventCard[];
}

export const forms: Record<'A' | 'B', Form> = {
  A: {
    id: 'A',
    places: [
      { name: 'Kaziranga', lat: 26.58, lon: 93.17 },
      { name: 'Hampi', lat: 15.33, lon: 76.46 },
      { name: 'Rann of Kutch', lat: 23.73, lon: 69.86 },
      { name: 'Chilika Lake', lat: 19.72, lon: 85.32 },
      { name: 'Sanchi', lat: 23.48, lon: 77.74 },
      { name: 'Silent Valley', lat: 11.08, lon: 76.45 },
      { name: 'Leh', lat: 34.15, lon: 77.58 },
    ],
    grid: [
      [6, 12, 18],
      [0, 7, 13, 19],
      [2, 8, 14, 15, 21],
      [1, 6, 11, 17, 23, 24],
      [4, 8, 12, 16, 20, 21, 22],
      [0, 5, 6, 12, 18, 19, 24, 9],
      [3, 7, 11, 10, 15, 16, 22, 23, 24],
    ],
    lists: [
      ['monsoon', 'delta', 'plateau', 'estuary', 'lagoon'],
      [
        'Article 21',
        'Article 32',
        'Article 356',
        'Article 14',
        'Article 280',
        'Article 110',
        'Article 51A',
      ],
      [
        'tariff',
        'subsidy',
        'repo rate',
        'fiscal deficit',
        'inflation',
        'current account',
        'disinvestment',
        'GST',
        'MSP',
      ],
    ],
    passage: {
      text:
        'Mangroves grow in the tidal zone where rivers meet the sea. Their tangled roots trap ' +
        'sediment and slow down waves, which protects coasts from erosion and storm surges. They ' +
        'also store more carbon per hectare than most land forests. India’s largest mangrove ' +
        'forest is the Sundarbans in the Ganga–Brahmaputra delta, home to the Royal Bengal tiger. ' +
        'Clearing for aquaculture and rising salinity are the main threats, and states now protect ' +
        'them under coastal regulation rules.',
      ideaUnits: [
        'Mangroves grow in tidal zones where rivers meet the sea',
        'Roots trap sediment and slow waves',
        'They protect coasts from erosion and storm surges',
        'They store a lot of carbon (more than most land forests)',
        'The Sundarbans is India’s largest mangrove forest',
        'The Sundarbans lies in the Ganga–Brahmaputra delta',
        'It is home to the Royal Bengal tiger',
        'Threats: clearing for aquaculture and rising salinity',
        'They are protected under coastal regulation rules',
      ],
    },
    events: [
      { label: 'Revolt of 1857', year: 1857 },
      { label: 'Partition of Bengal', year: 1905 },
      { label: 'Jallianwala Bagh', year: 1919 },
      { label: 'Dandi March', year: 1930 },
      { label: 'Quit India', year: 1942 },
      { label: 'Constitution adopted', year: 1949 },
    ],
  },
  B: {
    id: 'B',
    places: [
      { name: 'Sundarbans', lat: 21.95, lon: 88.9 },
      { name: 'Ajanta', lat: 20.55, lon: 75.7 },
      { name: 'Loktak Lake', lat: 24.55, lon: 93.8 },
      { name: 'Gir', lat: 21.12, lon: 70.82 },
      { name: 'Konark', lat: 19.89, lon: 86.09 },
      { name: 'Periyar', lat: 9.46, lon: 77.24 },
      { name: 'Spiti', lat: 32.25, lon: 78.03 },
    ],
    grid: [
      [2, 7, 12],
      [4, 8, 12, 16],
      [0, 1, 6, 11, 16],
      [3, 8, 13, 18, 17, 22],
      [5, 10, 11, 12, 13, 14, 19],
      [1, 2, 3, 8, 13, 18, 23, 22],
      [0, 6, 12, 18, 24, 20, 16, 8, 4],
    ],
    lists: [
      ['glacier', 'fjord', 'moraine', 'cirque', 'arete'],
      [
        'Article 19',
        'Article 72',
        'Article 243',
        'Article 324',
        'Article 368',
        'Article 15',
        'Article 40',
      ],
      [
        'CRR',
        'SLR',
        'bank rate',
        'revenue deficit',
        'WPI',
        'capital account',
        'FDI',
        'cess',
        'PDS',
      ],
    ],
    passage: {
      text:
        'Panchayats became constitutional bodies through the 73rd Amendment in 1992. It created a ' +
        'three-tier system at village, block and district levels for most states. One-third of ' +
        'seats are reserved for women, and many states have raised this to half. A State Election ' +
        'Commission conducts their elections every five years, and a State Finance Commission ' +
        'recommends how funds are shared. Gram Sabhas, made up of all adult voters of a village, ' +
        'review plans and spending, which makes local government more accountable.',
      ideaUnits: [
        'Panchayats became constitutional through the 73rd Amendment',
        'The amendment was passed in 1992',
        'It created a three-tier system: village, block and district',
        'One-third of seats are reserved for women',
        'Many states raised women’s reservation to half',
        'A State Election Commission holds elections every five years',
        'A State Finance Commission recommends sharing of funds',
        'Gram Sabhas include all adult voters of a village',
        'Gram Sabhas review plans and spending, improving accountability',
      ],
    },
    events: [
      { label: 'Battle of Plassey', year: 1757 },
      { label: 'Permanent Settlement', year: 1793 },
      { label: 'Indian National Congress founded', year: 1885 },
      { label: 'Non-Cooperation Movement', year: 1920 },
      { label: 'Government of India Act', year: 1935 },
      { label: 'Independence', year: 1947 },
    ],
  },
};
