import { assertCleanTree, formatTag, parseArguments } from './release-helpers';

test('parses both variants and a non-mutating dry-run option', () => {
  expect(parseArguments(['owner'])).toEqual({ variant: 'owner', dryRun: false });
  expect(parseArguments(['--dry-run', 'verification'])).toEqual({ variant: 'verification', dryRun: true });
  for (const args of [[], ['preview'], ['owner', 'verification'], ['owner', '--bad'], ['owner', '--dry-run', '--dry-run']]) {
    expect(() => parseArguments(args)).toThrow('Usage:');
  }
});

test('refuses tracked, staged and untracked changes', () => {
  expect(() => assertCleanTree('')).not.toThrow();
  for (const status of [' M app.config.ts\n', 'M  app.config.ts\n', '?? new-file\n']) {
    expect(() => assertCleanTree(status)).toThrow('git tree is dirty');
  }
});

test('tag suffix is the native build identity', () => {
  expect(formatTag('owner', '1.0.0', 3)).toBe('build/owner/1.0.0+3');
  expect(formatTag('verification', '1.0.0', 4)).toBe('build/verification/1.0.0+4');
  for (const build of [0, -1, 1.5, NaN]) expect(() => formatTag('owner', '1.0.0', build)).toThrow();
  expect(() => formatTag('other', '1.0.0', 1)).toThrow();
  expect(() => formatTag('owner', 'not-a-version', 1)).toThrow();
});
