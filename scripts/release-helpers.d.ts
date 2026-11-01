export function parseArguments(args: string[]): { variant: 'owner' | 'verification'; dryRun: boolean };
export function assertCleanTree(status: string): void;
export function formatTag(variant: string, version: string, buildNumber: number): string;
