export const dataKeys = {
  all: ['data'] as const,
  report: (build?: string) => ['data', 'report', build ?? 'all'] as const,
};
