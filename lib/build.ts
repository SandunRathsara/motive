import * as Application from 'expo-application';
import Constants from 'expo-constants';

// Direct property access is required for Expo's compile-time env inlining.
// Keep this constant (not runtime config) so owner releases eliminate verification branches.
export const isVerification = process.env.EXPO_PUBLIC_APP_VARIANT === 'verification';
export const variant = isVerification ? 'verification' : 'owner';

const configuredWorkerUrl: unknown = Constants.expoConfig?.extra?.workerUrl;
export const workerUrl: string | undefined =
  typeof configuredWorkerUrl === 'string' && configuredWorkerUrl.length > 0
    ? configuredWorkerUrl
    : undefined;

export const buildId = `${Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0'}+${Application.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? 'dev'}`;
