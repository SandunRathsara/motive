import { checkArchitecture } from './architecture/check.mjs';

const violations = checkArchitecture(process.argv[2] ?? process.cwd());
for (const violation of violations) {
  process.stdout.write(`${violation.path}:${violation.line} ${violation.rule} ${violation.message} (ARCHITECTURE §${violation.section})\n`);
}
process.stdout.write(violations.length ? `${violations.length} architecture violation(s).\n` : 'Architecture checks passed.\n');
process.exitCode = violations.length ? 1 : 0;
