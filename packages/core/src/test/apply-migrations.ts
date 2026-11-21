// Brings the isolated per-file D1 database up to date with migrations/*.sql
// before any test runs, using the same wrangler migration files as production.
import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
