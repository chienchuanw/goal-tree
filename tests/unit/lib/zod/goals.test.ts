import { describe, it, expect } from 'vitest';
import { CreateGoalSchema } from '@/lib/zod/goals';

const futureIso = () => new Date(Date.now() + 7 * 86_400_000).toISOString();
const pastIso = () => new Date(Date.now() - 86_400_000).toISOString();

describe('CreateGoalSchema', () => {
  describe('Given a valid input', () => {
    describe('When parsed', () => {
      it('Then returns a typed object with deadlineAt as a Date', () => {
        const result = CreateGoalSchema.parse({
          title: 'Pass JLPT N3',
          description: 'Listening + grammar focus',
          deadlineAt: futureIso(),
        });
        expect(result.title).toBe('Pass JLPT N3');
        expect(result.description).toBe('Listening + grammar focus');
        expect(result.deadlineAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Given a missing description', () => {
    describe('When parsed', () => {
      it('Then accepts and yields description as undefined', () => {
        const result = CreateGoalSchema.parse({
          title: 'Pass JLPT N3',
          deadlineAt: futureIso(),
        });
        expect(result.description).toBeUndefined();
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({ title: '', deadlineAt: futureIso() }),
        ).toThrow();
      });
    });
  });

  describe('Given a title longer than 200 characters', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({
            title: 'x'.repeat(201),
            deadlineAt: futureIso(),
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a description longer than 2000 characters', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({
            title: 'ok',
            description: 'x'.repeat(2001),
            deadlineAt: futureIso(),
          }),
        ).toThrow();
      });
    });
  });

  describe('Given a deadline already in the past', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateGoalSchema.parse({ title: 'ok', deadlineAt: pastIso() }),
        ).toThrow();
      });
    });
  });
});
