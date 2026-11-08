const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

module.exports = function withMotiveHealthKit(config) {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.healthkit'] = true;
    // .access is only for additional sensitive types (clinical records), not HK-1.
    return config;
  });
  return withInfoPlist(config, (config) => {
    config.modResults.NSHealthShareUsageDescription =
      'Motive reads weight, sleep, HRV, resting heart rate and workouts to show your signals. It never writes to Health.';
    return config;
  });
};
