# Shipped schemas

When tagging an installed build with a new schema version, capture the fresh
database's `sqlite_schema.sql` (ordered by type/name, excluding SQLite internals)
and `PRAGMA user_version` as `schema-v<N>.sql`. Never change an existing fixture.
`runner.test.ts` loads every fixture automatically and compares its upgraded
schema to a fresh install. v0 is the empty pre-install record; v1 is captured
from migration 1. `recorded_at` stores UTC Unix epoch milliseconds.

Migration 2 adds the health cache, availability and anchors. `schema-v2.sql` was
captured from a fresh database at its first tagged build,
`build/verification/1.0.0+10` (persistence code identical to that tag).
