import type { SessionSummaryContent } from '@/features/workouts';

export function summaryContent(overrides: Partial<SessionSummaryContent> = {}): SessionSummaryContent {
  return {
    sessionId: 'session-1', templateName: 'Full Body', dateText: 'Mon 9 Nov', durationText: '52 min', volumeText: '4,320 kg',
    bodyweightRepsText: null, setsText: '14 working sets',
    muscleGroups: [
      { muscleGroup: 'chest', label: 'Chest', sets: 3, text: 'Chest · 3 sets' },
      { muscleGroup: 'quadriceps', label: 'Quadriceps', sets: 3, text: 'Quadriceps · 3 sets' },
    ],
    comparison: { text: '+240 kg vs Full Body on Fri 6 Nov', direction: 'up' },
    nextTimeLine: 'Bench moves to 82.5 × 6; Row repeats 60 kg after 1 Failed Set',
    linkedWorkoutText: null, counts: true, countsText: 'Counts toward your weekly target',
    ...overrides,
  };
}
