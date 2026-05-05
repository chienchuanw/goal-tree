import { describe, it, expect } from 'vitest';
import { parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  describe('Given a valid env object', () => {
    describe('When parsed', () => {
      it('Then returns typed env', () => {
        const env = parseEnv({
          DATABASE_URL: 'postgres://u:p@h:5432/d',
          AUTH_SECRET: 'x'.repeat(32),
          AUTH_GITHUB_ID: 'gh-id',
          AUTH_GITHUB_SECRET: 'gh-secret',
          ALLOWED_GITHUB_ID: '12345',
          NEXTAUTH_URL: 'http://localhost:3000',
        });
        expect(env.DATABASE_URL).toMatch(/^postgres:\/\//);
        expect(env.ALLOWED_GITHUB_ID).toBe('12345');
      });
    });
  });

  describe('Given missing AUTH_SECRET', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() => parseEnv({ DATABASE_URL: 'postgres://x' } as never))
          .toThrow(/AUTH_SECRET/);
      });
    });
  });
});
