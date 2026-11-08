import type { HealthSignalType } from '../health.types';

export const healthKeys = {
  all: ['health'] as const,
  signals: ['health', 'signals'] as const,
  detail: (type: HealthSignalType) => ['health', 'detail', type] as const,
  today: ['health', 'today'] as const,
  refresh: ['health', 'refresh'] as const,
  connect: ['health', 'connect'] as const,
  deleteHistory: (type: HealthSignalType) => ['health', 'deleteHistory', type] as const,
};
