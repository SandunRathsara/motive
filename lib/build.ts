import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { z } from 'zod';

// Direct property access is required for Expo's compile-time env inlining.
// Keep this constant (not runtime config) so owner releases eliminate verification branches.
export const isVerification = process.env.EXPO_PUBLIC_APP_VARIANT === 'verification';
export const variant = z.enum(['owner', 'verification']).default('owner').parse(process.env.EXPO_PUBLIC_APP_VARIANT);

const identity = z.object({
  nativeVersion: z.string().min(1).nullish(),
  nativeBuild: z.string().min(1).nullish(),
  config: z.object({
    version: z.string().min(1).optional(),
    ios: z.object({ buildNumber: z.string().min(1).optional() }).optional(),
    extra: z.object({ workerUrl: z.string().min(1).optional().catch(undefined) }).optional(),
  }).nullish(),
}).parse({
  nativeVersion: Application.nativeApplicationVersion,
  nativeBuild: Application.nativeBuildVersion,
  config: Constants.expoConfig,
});

export const workerUrl = identity.config?.extra?.workerUrl;
export const version = identity.nativeVersion ?? identity.config?.version ?? '0.0.0';
export const buildNumber = identity.nativeBuild ?? identity.config?.ios?.buildNumber ?? 'dev';
export const buildId = `${version}+${buildNumber}`;
/**
 * BUILD-1: the release script tags every installed build `build/<variant>/<version>+<buildNumber>`
 * from the same committed version source the native identity is built from, so the tag is derived
 * here rather than injected. Untagged development identities have no tag.
 */
export const gitTag = /^\d+\.\d+\.\d+$/.test(version) && /^[1-9]\d*$/.test(buildNumber) ? `build/${variant}/${buildId}` : null;
export interface BuildIdentity { variant: typeof variant; version: string; buildNumber: string; buildId: string; gitTag: string | null }
export const buildIdentity: BuildIdentity = { variant, version, buildNumber, buildId, gitTag };
