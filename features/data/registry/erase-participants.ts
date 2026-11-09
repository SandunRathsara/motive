import type { EraseParticipant } from '@/lib/contracts/erase-participant';
import { metricsEraseParticipant } from '@/features/metrics';
import { healthEraseParticipant } from '@/features/health';
import { planEraseParticipant } from '@/features/plan';
import { workoutsEraseParticipant } from '@/features/workouts';

/** The record tree and Query caches are built in to the eraser. */
export const eraseParticipants: readonly EraseParticipant[] = [metricsEraseParticipant, healthEraseParticipant, planEraseParticipant, workoutsEraseParticipant];
