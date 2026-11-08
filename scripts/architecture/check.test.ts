/// <reference types="node" />

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const fixtures = JSON.parse(readFileSync(path.join(__dirname, '__fixtures__/cases.json'), 'utf8')) as {
  clean: Record<string, string>;
  violations: { path: string; source: string; rule: string; line?: number }[];
};
const cli = path.resolve(__dirname, '../check-architecture.mjs');
let root: string;

function writeTree(files: Record<string, string>) {
  for (const [file, source] of Object.entries(files)) {
    const destination = path.join(root, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  }
}

function run() {
  return spawnSync(process.execPath, [cli, root], { encoding: 'utf8' });
}

beforeEach(() => { root = mkdtempSync(path.join(tmpdir(), 'motive-architecture-')); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

test('clean layers, public contracts, type imports, health services and logger pass', () => {
  writeTree(fixtures.clean);
  const result = run();
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  expect(result.stdout).toBe('Architecture checks passed.\n');
});

test.each(fixtures.violations)('$path reports $rule', (fixture) => {
  writeTree({ [fixture.path]: fixture.source });
  const result = run();
  expect(result.stderr).toBe('');
  expect(result.status).toBe(1);
  expect(result.stdout).toContain(`${fixture.path}:${fixture.line ?? 1} ${fixture.rule} `);
  expect(result.stdout).toMatch(/\(ARCHITECTURE §[345]\)/);
  expect(result.stdout).toMatch(/\d+ architecture violation\(s\)\.\n$/);
});

test('missing source roots and import-looking comments/strings are harmless', () => {
  writeTree({ 'lib/text.ts': `// import 'openai';\nconst text = "console.log('safe')";` });
  expect(run().status).toBe(0);
});

test('HealthKit loader comments/strings and unrelated native modules are harmless', () => {
  writeTree({ 'lib/native/other.ts': `import { requireNativeModule } from 'expo';
// requireNativeModule('MotiveHealthKit');
const example = "requireOptionalNativeModule('MotiveHealthKit')";
requireNativeModule('MotiveRecordDirectory');` });
  expect(run().status).toBe(0);
});

test('React Native Modal presentation enums are behavior, not inline visual styles', () => {
  writeTree({ 'components/organisms/Confirmation.tsx': `import { Modal } from 'react-native';
export const Confirmation = () => <Modal presentationStyle="pageSheet" />;` });
  expect(run().status).toBe(0);
});

test('default root is cwd', () => {
  const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8' });
  expect(result.status).toBe(0);
});
