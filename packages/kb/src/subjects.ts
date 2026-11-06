// Learner-facing subjects (onboarding "Where you stand"), each covering one or more syllabus
// sections. Levels are stored per section so planners can work at section granularity.

export interface Subject {
  id: string;
  title: string;
  sections: string[];
}

export const subjects: Subject[] = [
  {
    id: 'history',
    title: 'History',
    sections: [
      'prelims_gs1.ancient-indian-history',
      'prelims_gs1.medieval-indian-history',
      'gs1.modern-history',
      'gs1.post-independence',
      'gs1.world-history',
    ],
  },
  { id: 'culture', title: 'Art & Culture', sections: ['gs1.art-and-culture'] },
  { id: 'society', title: 'Society', sections: ['gs1.indian-society'] },
  {
    id: 'geography',
    title: 'Geography',
    sections: ['gs1.physical-geography', 'gs1.economic-and-human-geography'],
  },
  {
    id: 'polity',
    title: 'Polity',
    sections: [
      'gs2.indian-constitution-and-polity',
      'gs2.organs-of-state',
      'gs2.constitutional-and-statutory-bodies',
    ],
  },
  {
    id: 'governance',
    title: 'Governance & Social Justice',
    sections: ['gs2.governance-and-public-administration', 'gs2.social-justice-and-welfare'],
  },
  { id: 'ir', title: 'International Relations', sections: ['gs2.international-relations'] },
  {
    id: 'economy',
    title: 'Economy',
    sections: ['gs3.indian-economy', 'gs3.agriculture', 'gs3.industry-infrastructure'],
  },
  {
    id: 'environment',
    title: 'Environment',
    sections: ['gs3.environment-biodiversity', 'gs3.disaster-management'],
  },
  {
    id: 'science',
    title: 'Science & Tech',
    sections: [
      'gs3.science-technology',
      'prelims_gs1.general-science-biology',
      'prelims_gs1.general-science-physics-chemistry',
    ],
  },
  { id: 'security', title: 'Internal Security', sections: ['gs3.internal-security'] },
  {
    id: 'ethics',
    title: 'Ethics',
    sections: [
      'gs4.ethics-human-interface',
      'gs4.attitude',
      'gs4.civil-service-aptitude-and-values',
      'gs4.emotional-intelligence',
      'gs4.moral-thinkers-and-philosophers',
      'gs4.public-service-ethics-and-governance',
      'gs4.probity-in-governance-and-anti-corruptio',
      'gs4.applied-ethics-and-case-studies',
    ],
  },
  {
    id: 'current',
    title: 'Current Affairs',
    sections: ['prelims_gs1.current-events-and-factual-gk'],
  },
  {
    id: 'csat',
    title: 'CSAT',
    sections: [
      'csat.comprehension',
      'csat.logical-reasoning',
      'csat.basic-numeracy',
      'csat.data-interpretation',
    ],
  },
  {
    id: 'essay',
    title: 'Essay',
    sections: [
      'essay.essay-methodology-craft',
      'essay.philosophical-and-reflective-essays',
      'essay.governance-society-and-development',
      'essay.technology-economy-and-environment',
    ],
  },
];

export const subjectOfSection = new Map(
  subjects.flatMap((s) => s.sections.map((sec) => [sec, s.id] as const)),
);

/** Starting mastery for a self-rating. */
export const selfLevelValue = { new: 0.1, some: 0.4, strong: 0.7 } as const;
