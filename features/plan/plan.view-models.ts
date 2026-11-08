import { dayKey } from '@/lib/utils/time';
import type { PlanState, PlanVersion } from './plan.schemas';

export type TodayPlanViewModel = {
  status: 'loading' | 'ready' | 'error';
  dateLabel: string;
  targets: Pick<PlanState, 'kcalTarget' | 'kcalOrigin' | 'proteinFloorG'> | null;
  chipLabel: string | null;
  retry: () => void;
};

export function planChipLabel(version: PlanVersion | null, now: number): string | null {
  if (!version || dayKey(version.createdAt) !== dayKey(now)) return null;
  return version.number === 1 ? 'Plan v1' : `Plan v${version.number} · changed today`;
}
