export const planKeys = {
  all: ['plan'] as const, current: ['plan', 'current'] as const, versions: ['plan', 'versions'] as const,
  startingEstimate: ['plan', 'startingEstimate'] as const,
  editKcalTarget: ['plan', 'editKcalTarget'] as const,
  editGoal: ['plan', 'editGoal'] as const,
  editProteinFloor: ['plan', 'editProteinFloor'] as const,
};
