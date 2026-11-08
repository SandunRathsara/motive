import { parseRows, requireRecord, type SqlConnection } from '@/lib/persistence';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { profileSchema, profileRowSchema, type Profile } from '../profile.schemas';

export class ProfileError extends Error {
  constructor(readonly code: 'invalidInput' | 'recordWritesBlocked' | 'readFailed' | 'writeFailed') { super(code); this.name = 'ProfileError'; }
}

/** Accepts a transaction connection; never starts a nested transaction. */
export function createProfileRepository(connection?: SqlConnection) {
  const db = () => connection ?? requireRecord();
  return {
    async read() {
      try {
        const result = parseRows(profileRowSchema, await db().getAll('SELECT * FROM profile ORDER BY id'));
        return { ...result, profile: result.rows[0] ?? null };
      } catch { throw new ProfileError('readFailed'); }
    },
    async insert(input: Profile): Promise<void> {
      if (!recordWritesAllowed()) throw new ProfileError('recordWritesBlocked');
      const parsed = profileSchema.safeParse(input);
      if (!parsed.success) throw new ProfileError('invalidInput');
      const profile = parsed.data;
      try {
        await db().run('INSERT INTO profile VALUES (1, ?, ?, ?, ?, ?, ?, ?)', [
          profile.sex, profile.age, profile.heightCm, profile.activityLevel, profile.weightKg,
          JSON.stringify(profile.weightOrigin), profile.createdAt,
        ]);
      } catch { throw new ProfileError('writeFailed'); }
    },
  };
}
