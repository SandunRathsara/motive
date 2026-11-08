import type { ConfigContext, ExpoConfig } from 'expo/config';
import identity from './scripts/release-version.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? 'owner';
  if (variant !== 'owner' && variant !== 'verification') {
    throw new Error(`Unknown APP_VARIANT: ${variant}. Expected owner or verification.`);
  }
  if (process.env.EXPO_PUBLIC_APP_VARIANT && process.env.EXPO_PUBLIC_APP_VARIANT !== variant) {
    throw new Error('APP_VARIANT and EXPO_PUBLIC_APP_VARIANT must match.');
  }
  // Also select the correct compile-time flag during local Metro/export runs.
  process.env.EXPO_PUBLIC_APP_VARIANT = variant;
  const verification = variant === 'verification';
  return {
    ...config,
    name: verification ? 'Motive Verify' : 'Motive',
    slug: 'motive',
    owner: 'marvellous-tech',
    version: identity.version,
    icon: verification ? './assets/icon-verification.png' : './assets/icon-owner.png',
    scheme: verification ? 'motive-verification' : 'motive',
    userInterfaceStyle: 'dark',
    ios: {
      ...config.ios,
      bundleIdentifier: verification ? 'dev.motive.app.verification' : 'dev.motive.app',
      buildNumber: String(identity.buildNumber),
      supportsTablet: false,
    },
    web: { bundler: 'metro' },
    plugins: ['expo-router', 'expo-sqlite', 'expo-sharing'],
    experiments: { typedRoutes: true, reactCompiler: true },
    extra: {
      ...config.extra,
      eas: { projectId: '3c7b29ed-24f3-44a3-a0f6-5eb06096e3e6' },
      variant,
      // Public, per-variant slots; slice 7 supplies the actual Worker endpoints.
      workerUrl: (verification ? process.env.VERIFICATION_WORKER_URL : process.env.OWNER_WORKER_URL) || undefined,
    },
  };
};
