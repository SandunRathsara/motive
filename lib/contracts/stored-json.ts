import { z } from 'zod';

/** JSON text is untrusted storage, including malformed JSON syntax. */
export const storedJsonSchema = z.string().transform((text, ctx): unknown => {
  try { return JSON.parse(text); } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid stored JSON' });
    return z.NEVER;
  }
});
