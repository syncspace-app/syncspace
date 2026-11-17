// Deterministic environment for unit and e2e tests. AppModule ignores .env
// files when NODE_ENV is "test", so tests never depend on a developer machine.
process.env.NODE_ENV = 'test';

process.env.PORT ??= '4000';
process.env.WEB_ORIGIN ??= 'http://localhost:3000';
process.env.DATABASE_URL ??=
  'postgresql://test:test@localhost:5432/syncspace_test';
process.env.DIRECT_URL ??=
  'postgresql://test:test@localhost:5432/syncspace_test';
process.env.BETTER_AUTH_SECRET ??=
  'test-only-better-auth-secret-at-least-32-chars';
process.env.BETTER_AUTH_URL ??= 'http://localhost:4000';
