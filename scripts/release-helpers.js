function parseArguments(args) {
  const variants = args.filter((arg) => arg !== '--dry-run');
  if (variants.length !== 1 || !['owner', 'verification'].includes(variants[0]) ||
      args.filter((arg) => arg === '--dry-run').length > 1) {
    throw new Error('Usage: npm run release -- <owner|verification> [--dry-run]');
  }
  return { variant: variants[0], dryRun: args.includes('--dry-run') };
}

function assertCleanTree(status) {
  if (status.trim()) throw new Error('Release refused: git tree is dirty. Commit or stash changes first.');
}

function formatTag(variant, version, buildNumber) {
  if (!['owner', 'verification'].includes(variant) || !/^\d+\.\d+\.\d+$/.test(version) ||
      !Number.isSafeInteger(buildNumber) || buildNumber < 1) {
    throw new Error('Invalid release variant, version or build number.');
  }
  return `build/${variant}/${version}+${buildNumber}`;
}

module.exports = { parseArguments, assertCleanTree, formatTag };
