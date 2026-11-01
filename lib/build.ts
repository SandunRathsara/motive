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
export const buildId = `${identity.nativeVersion ?? identity.config?.version ?? '0.0.0'}+${identity.nativeBuild ?? identity.config?.ios?.buildNumber ?? 'dev'}`;
