import { validateEnv } from './env.js';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '4000',
  WEB_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/syncspace_test',
  DIRECT_URL: 'postgresql://test:test@localhost:5432/syncspace_test',
  BETTER_AUTH_SECRET: 'test-only-better-auth-secret-at-least-32-chars',
  BETTER_AUTH_URL: 'http://localhost:4000',
};

describe('validateEnv', () => {
  it('coerces PORT to a number', () => {
    const env = validateEnv({ ...validEnv, PORT: '4100' });

    expect(env.PORT).toBe(4100);
  });

  it('applies the default port when PORT is missing', () => {
    const env = validateEnv({ ...validEnv, PORT: undefined });

    expect(env.PORT).toBe(4000);
  });

  it('names the missing variable when validation fails', () => {
    expect(() =>
      validateEnv({ ...validEnv, BETTER_AUTH_SECRET: undefined }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});
