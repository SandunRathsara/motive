CREATE TABLE gate_metric (
  id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('food_active_input', 'recognition_wait', 'set_logging', 'unclean_exit')),
  duration_ms INTEGER CHECK (event_type != 'unclean_exit' OR duration_ms IS NULL),
  build TEXT NOT NULL,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX gate_metric_recorded_at ON gate_metric(recorded_at);
PRAGMA user_version = 1;
