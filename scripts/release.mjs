import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import helpers from './release-helpers.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const identityPath = 'scripts/release-version.json';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const print = (line) => process.stdout.write(`${line}\n`);

try {
  const { variant, dryRun } = helpers.parseArguments(process.argv.slice(2));
  helpers.assertCleanTree(git('status', '--porcelain'));
  const identity = JSON.parse(readFileSync(new URL('./release-version.json', import.meta.url), 'utf8'));
  const next = { ...identity, buildNumber: identity.buildNumber + 1 };
  const tag = helpers.formatTag(variant, next.version, next.buildNumber);
  if (git('tag', '--list', tag)) throw new Error(`Release refused: tag ${tag} already exists.`);
  // BUILD-1 free-provisioning amendment: local Xcode build, signed by the owner's free Personal Team.
  // Prompts (device, signing team) are interactive on purpose; --no-bundler lets the command exit after install.
  const steps = [
    ['expo', 'prebuild', '--platform', 'ios', '--clean'],
    ['expo', 'run:ios', '--device', '--configuration', 'Release', '--no-bundler'],
  ];
  print(`${dryRun ? '[dry-run] ' : ''}Commit build number ${next.buildNumber}; ${steps.map((s) => `npx ${s.join(' ')}`).join('; ')}; tag ${tag}`);
  if (!dryRun) {
    writeFileSync(new URL('./release-version.json', import.meta.url), `${JSON.stringify(next, null, 2)}\n`);
    git('add', '--', identityPath);
    git('commit', '-m', `build: ${variant} ${next.version}+${next.buildNumber}`, '--', identityPath);
    helpers.assertCleanTree(git('status', '--porcelain'));
    const commit = git('rev-parse', 'HEAD');
    for (const step of steps) {
      const result = spawnSync('npx', step, {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, APP_VARIANT: variant, EXPO_PUBLIC_APP_VARIANT: variant },
      });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error('Build or install failed or was interrupted; no tag created. Build-number commit is retained.');
    }
    helpers.assertCleanTree(git('status', '--porcelain'));
    if (git('rev-parse', 'HEAD') !== commit) throw new Error('HEAD changed during build; no tag created.');
    git('tag', '-a', tag, commit, '-m', `Motive ${variant} ${next.version}+${next.buildNumber}`);
  }
  print(`git push origin ${tag}`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
