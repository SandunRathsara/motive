import { z } from 'zod';

/** All timestamps carry a numeric local offset, including UTC as +00:00. */
const timestamp = z.iso.datetime({ offset: true }).regex(/[+-]\d{2}:\d{2}$/);
export const canonicalUnits = {
  bodyMass: 'kg', length: 'cm', foodMass: 'g', volume: 'ml', energy: 'kcal', duration: 's', timestamp: 'ISO-8601 with offset',
} as const;

/**
 * Format 1: `sections[key]` holds independently versioned, feature-validated JSON records.
 * IDs and relationships are preserved verbatim. `skippedRowCounts[key]` counts invalid
 * stored rows omitted by that section; every section has a count, including zero.
 * `schemaVersion` is SQLite user_version from the same snapshot as the records.
 * Bump formatVersion only for a breaking envelope change, not a new section/version.
 */
export const exportEnvelopeSchema = z.object({
  format: z.literal('motive-personal-health-record'),
  formatVersion: z.literal(1),
  schemaVersion: z.number().int().nonnegative(),
  exportedAt: timestamp,
  build: z.object({
    variant: z.enum(['owner', 'verification']),
    version: z.string().min(1),
    buildNumber: z.string().min(1),
    buildId: z.string().min(1),
    gitTag: z.string().min(1).nullable(),
  }).strict(),
  canonicalUnits: z.object({
    bodyMass: z.literal('kg'), length: z.literal('cm'), foodMass: z.literal('g'), volume: z.literal('ml'),
    energy: z.literal('kcal'), duration: z.literal('s'), timestamp: z.literal('ISO-8601 with offset'),
  }).strict(),
  sections: z.record(z.string().min(1), z.object({
    version: z.number().int().positive(),
    owner: z.string().min(1),
    records: z.array(z.json()),
  }).strict()),
  skippedRowCounts: z.record(z.string().min(1), z.number().int().nonnegative()),
}).strict().refine((value) => {
  const sections = Object.keys(value.sections);
  return sections.length === Object.keys(value.skippedRowCounts).length &&
    sections.every((key) => Object.hasOwn(value.skippedRowCounts, key));
}, { message: 'Every section must have exactly one skipped-row count' });

export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;
