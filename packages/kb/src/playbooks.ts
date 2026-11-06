// Pedagogy playbooks (KB-06): anonymous teaching patterns as typed config, read by the planner,
// study sessions, cues and evaluators. Never attributed to anyone in the app.

export type PlaybookId =
  'PB-PYQ' | 'PB-WHERE' | 'PB-MISTAKE' | 'PB-HEAT' | 'PB-FOCUS' | 'PB-SWITCH' | 'PB-CA-LINK';

export const MistakeCauses = ['didnt_know', 'misread', 'eliminated_wrong', 'guessed'] as const;
export type MistakeCause = (typeof MistakeCauses)[number];

export const playbooks = {
  'PB-PYQ': {
    behaviour: 'PYQ-first priming: show how the node is asked, then where to read, then recall',
    usedBy: ['planner', 'study-session'],
    primingPyqs: { min: 2, max: 3 },
    retrievalCheck: { min: 3, max: 5 },
  },
  'PB-WHERE': {
    behaviour: 'Point to source, chapter and question demand; explain only after an attempt',
    usedBy: ['study-session', 'cues'],
    explainAfterAttempt: true,
  },
  'PB-MISTAKE': {
    behaviour: 'Every wrong answer is logged with a one-tap cause and becomes a revision card',
    usedBy: ['ca-quiz', 'diagnostic', 'study-session'],
    causes: MistakeCauses,
    trapsSummaryEveryDays: 30,
  },
  'PB-HEAT': {
    behaviour: 'Syllabus heatmap of mastery that drives revision before Prelims',
    usedBy: ['library'],
    bands: [0.3, 0.6, 0.85],
  },
  'PB-FOCUS': {
    behaviour: 'One task per session with one concrete goal line; weekly well-being check-in',
    usedBy: ['planner', 'nudges'],
    tasksPerSession: 1,
    checkInEveryDays: 7,
  },
  'PB-SWITCH': {
    behaviour: 'Switch to Prelims-only mode before Prelims, and to Mains mode after it',
    usedBy: ['planner'],
    /** Days before Prelims when the planner stops new Mains-only study. */
    prelimsOnlyDaysBefore: 100,
  },
  'PB-CA-LINK': {
    behaviour: 'Every current-affairs item opens its static node; every node shows recent CA',
    usedBy: ['ca-feed', 'study-session'],
    recentCaDays: 90,
  },
} as const satisfies Record<
  PlaybookId,
  { behaviour: string; usedBy: readonly string[]; [param: string]: unknown }
>;
