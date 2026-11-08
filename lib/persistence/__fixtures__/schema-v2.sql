CREATE TABLE gate_metric (
  id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('food_active_input', 'recognition_wait', 'set_logging', 'unclean_exit')),
  duration_ms INTEGER CHECK (event_type != 'unclean_exit' OR duration_ms IS NULL),
  build TEXT NOT NULL,
  recorded_at INTEGER NOT NULL
);
CREATE TABLE health_sample (
  id TEXT PRIMARY KEY NOT NULL,
  hk_uuid TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout')),
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL CHECK (end_ms >= start_ms),
  value REAL,
  unit TEXT,
  sleep_stage TEXT CHECK (sleep_stage IN ('inBed', 'awake', 'asleepCore', 'asleepDeep', 'asleepREM', 'asleepUnspecified')),
  activity_type INTEGER CHECK (activity_type >= 0),
  source_bundle_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_version TEXT,
  source_product_type TEXT,
  source_os_version TEXT,
  device_present INTEGER NOT NULL CHECK (device_present IN (0, 1)),
  device_model TEXT,
  device_manufacturer TEXT,
  device_hardware_version TEXT,
  device_software_version TEXT,
  device_name TEXT,
  user_entered INTEGER NOT NULL CHECK (user_entered IN (0, 1)),
  CHECK (
    (type IN ('bodyMass', 'hrv', 'restingHeartRate') AND value IS NOT NULL AND value > 0 AND
      unit IS NOT NULL AND unit = CASE type WHEN 'bodyMass' THEN 'kg' WHEN 'hrv' THEN 'ms' ELSE 'bpm' END AND
      sleep_stage IS NULL AND activity_type IS NULL) OR
    (type = 'sleep' AND sleep_stage IS NOT NULL AND value IS NULL AND unit IS NULL AND activity_type IS NULL) OR
    (type = 'workout' AND activity_type IS NOT NULL AND value IS NULL AND unit IS NULL AND sleep_stage IS NULL)
  )
);
CREATE TABLE health_sync_anchor (
  type TEXT PRIMARY KEY NOT NULL CHECK (type IN ('bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout')),
  anchor TEXT,
  backfill_start_ms INTEGER NOT NULL
);
CREATE TABLE signal_availability (
  type TEXT PRIMARY KEY NOT NULL CHECK (type IN ('bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout')),
  state TEXT NOT NULL CHECK (state IN ('unavailableOnDevice', 'notRequested', 'requested')),
  read_state TEXT CHECK (read_state IN ('hasSamples', 'noReadableSamples', 'queryError')),
  last_query_at INTEGER,
  last_sample_at INTEGER,
  CHECK (state = 'requested' OR read_state IS NULL)
);
CREATE INDEX gate_metric_recorded_at ON gate_metric(recorded_at);
CREATE INDEX health_sample_type_start ON health_sample(type, start_ms);
PRAGMA user_version = 2;
