export interface Migration { readonly version: number; readonly sql: string }

/** Append only. recorded_at is UTC Unix epoch milliseconds (INTEGER). */
export const migrations: readonly Migration[] = [{
  version: 1,
  sql: `CREATE TABLE gate_metric (
  id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('food_active_input', 'recognition_wait', 'set_logging', 'unclean_exit')),
  duration_ms INTEGER CHECK (event_type != 'unclean_exit' OR duration_ms IS NULL),
  build TEXT NOT NULL,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX gate_metric_recorded_at ON gate_metric(recorded_at);`,
}, {
  version: 2,
  sql: `CREATE TABLE health_sample (
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
CREATE INDEX health_sample_type_start ON health_sample(type, start_ms);
CREATE TABLE signal_availability (
  type TEXT PRIMARY KEY NOT NULL CHECK (type IN ('bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout')),
  state TEXT NOT NULL CHECK (state IN ('unavailableOnDevice', 'notRequested', 'requested')),
  read_state TEXT CHECK (read_state IN ('hasSamples', 'noReadableSamples', 'queryError')),
  last_query_at INTEGER,
  last_sample_at INTEGER,
  CHECK (state = 'requested' OR read_state IS NULL)
);
CREATE TABLE health_sync_anchor (
  type TEXT PRIMARY KEY NOT NULL CHECK (type IN ('bodyMass', 'sleep', 'restingHeartRate', 'hrv', 'workout')),
  anchor TEXT,
  backfill_start_ms INTEGER NOT NULL
);`,
}, {
  version: 3,
  // Static insert-only content: lib must never import features/workouts. A parity test guards the seed.
  sql: `CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sex TEXT NOT NULL,
  age INTEGER NOT NULL,
  height_cm REAL NOT NULL,
  activity_level REAL NOT NULL,
  weight_kg REAL NOT NULL,
  weight_origin_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE starting_estimate (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value_kcal REAL NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE plan_version (
  number INTEGER PRIMARY KEY NOT NULL CHECK (number > 0),
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_ref INTEGER,
  snapshot_json TEXT NOT NULL,
  diff_json TEXT NOT NULL
);
CREATE TABLE exercise_library (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT NOT NULL,
  bodyweight INTEGER NOT NULL CHECK (bodyweight IN (0, 1)),
  library_version INTEGER NOT NULL CHECK (library_version > 0)
);
INSERT INTO exercise_library (id, name, muscle_group, equipment, bodyweight, library_version) VALUES
('bench-press', 'Bench Press', 'chest', 'barbell', 0, 1),
('incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', 'dumbbell', 0, 1),
('push-up', 'Push-up', 'chest', 'none', 1, 1),
('lat-pulldown', 'Lat Pulldown', 'back', 'machine', 0, 1),
('barbell-row', 'Barbell Row', 'back', 'barbell', 0, 1),
('seated-cable-row', 'Seated Cable Row', 'back', 'cable', 0, 1),
('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 0, 1),
('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', 'shoulders', 'dumbbell', 0, 1),
('machine-shoulder-press', 'Machine Shoulder Press', 'shoulders', 'machine', 0, 1),
('barbell-curl', 'Barbell Curl', 'biceps', 'barbell', 0, 1),
('dumbbell-curl', 'Dumbbell Curl', 'biceps', 'dumbbell', 0, 1),
('cable-curl', 'Cable Curl', 'biceps', 'cable', 0, 1),
('cable-triceps-pushdown', 'Cable Triceps Pushdown', 'triceps', 'cable', 0, 1),
('dumbbell-overhead-triceps-extension', 'Dumbbell Overhead Triceps Extension', 'triceps', 'dumbbell', 0, 1),
('lying-triceps-extension', 'Lying Triceps Extension', 'triceps', 'barbell', 0, 1),
('back-squat', 'Back Squat', 'quadriceps', 'barbell', 0, 1),
('leg-press', 'Leg Press', 'quadriceps', 'machine', 0, 1),
('leg-extension', 'Leg Extension', 'quadriceps', 'machine', 0, 1),
('romanian-deadlift', 'Romanian Deadlift', 'hamstrings', 'barbell', 0, 1),
('lying-leg-curl', 'Lying Leg Curl', 'hamstrings', 'machine', 0, 1),
('seated-leg-curl', 'Seated Leg Curl', 'hamstrings', 'machine', 0, 1),
('barbell-hip-thrust', 'Barbell Hip Thrust', 'glutes', 'barbell', 0, 1),
('glute-bridge', 'Glute Bridge', 'glutes', 'none', 1, 1),
('cable-kickback', 'Cable Kickback', 'glutes', 'cable', 0, 1),
('standing-calf-raise', 'Standing Calf Raise', 'calves', 'machine', 0, 1),
('seated-calf-raise', 'Seated Calf Raise', 'calves', 'machine', 0, 1),
('bodyweight-calf-raise', 'Bodyweight Calf Raise', 'calves', 'none', 1, 1),
('crunch', 'Crunch', 'core', 'none', 1, 1),
('reverse-crunch', 'Reverse Crunch', 'core', 'none', 1, 1),
('cable-crunch', 'Cable Crunch', 'core', 'cable', 0, 1);`,
}];
