import * as Sharing from 'expo-sharing';

export type ShareOutcome = { ok: true } | { ok: false; code: 'sharingUnavailable' | 'shareFailed' };
export interface ShareRequest { uri: string; mimeType: string; uti?: string; dialogTitle: string }
/** The only native share-sheet adapter (architecture rule `native-share`). */
export interface ShareAdapter { share(request: ShareRequest): Promise<ShareOutcome> }

export const nativeShare: ShareAdapter = {
  async share({ uri, mimeType, uti, dialogTitle }) {
    try {
      if (!await Sharing.isAvailableAsync()) return { ok: false, code: 'sharingUnavailable' };
      // Resolves when the sheet closes, whether the owner shared or cancelled.
      await Sharing.shareAsync(uri, { mimeType, UTI: uti, dialogTitle });
      return { ok: true };
    } catch { return { ok: false, code: 'shareFailed' }; }
  },
};
