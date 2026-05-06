import { describe, it, expect } from 'vitest';
import {
  CreateNoteSchema,
  SaveNoteSchema,
  RenameNoteSchema,
  SetNoteGoalSchema,
  MoveNoteSchema,
} from '@/lib/zod/notes';

const uuid = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateNoteSchema', () => {
  describe('Given a valid root note input', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        const parsed = CreateNoteSchema.parse({ title: 'A' });
        expect(parsed.title).toBe('A');
        expect(parsed.parentId).toBeUndefined();
      });
    });
  });

  describe('Given a valid child note input', () => {
    describe('When parsed', () => {
      it('Then accepts parentId and goalId', () => {
        const parsed = CreateNoteSchema.parse({
          title: 'B',
          parentId: uuid,
          goalId: uuid,
        });
        expect(parsed.parentId).toBe(uuid);
        expect(parsed.goalId).toBe(uuid);
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() => CreateNoteSchema.parse({ title: '' })).toThrow();
      });
    });
  });

  describe('Given a non-uuid parentId', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          CreateNoteSchema.parse({ title: 'A', parentId: 'not-a-uuid' }),
        ).toThrow();
      });
    });
  });
});

describe('SaveNoteSchema', () => {
  describe('Given a valid input', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        const parsed = SaveNoteSchema.parse({
          id: uuid,
          title: 'A',
          bodyMd: '# Hello',
        });
        expect(parsed.bodyMd).toBe('# Hello');
      });
    });
  });

  describe('Given a body over 100KB', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SaveNoteSchema.parse({
            id: uuid,
            title: 'A',
            bodyMd: 'x'.repeat(100_001),
          }),
        ).toThrow();
      });
    });
  });

  describe('Given an empty title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          SaveNoteSchema.parse({ id: uuid, title: '', bodyMd: '' }),
        ).toThrow();
      });
    });
  });
});

describe('RenameNoteSchema', () => {
  describe('Given a valid input', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        expect(RenameNoteSchema.parse({ id: uuid, title: 'New' }).title).toBe(
          'New',
        );
      });
    });
  });

  describe('Given a 201-character title', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          RenameNoteSchema.parse({ id: uuid, title: 'x'.repeat(201) }),
        ).toThrow();
      });
    });
  });
});

describe('SetNoteGoalSchema', () => {
  describe('Given goalId=null', () => {
    describe('When parsed', () => {
      it('Then accepts it (unlink)', () => {
        expect(SetNoteGoalSchema.parse({ id: uuid, goalId: null }).goalId).toBeNull();
      });
    });
  });

  describe('Given a valid goalId', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        expect(SetNoteGoalSchema.parse({ id: uuid, goalId: uuid }).goalId).toBe(uuid);
      });
    });
  });
});

describe('MoveNoteSchema', () => {
  describe('Given newParentId=null (move to root)', () => {
    describe('When parsed', () => {
      it('Then accepts it', () => {
        expect(MoveNoteSchema.parse({ id: uuid, newParentId: null }).newParentId).toBeNull();
      });
    });
  });

  describe('Given a non-uuid newParentId', () => {
    describe('When parsed', () => {
      it('Then throws', () => {
        expect(() =>
          MoveNoteSchema.parse({ id: uuid, newParentId: 'bad' }),
        ).toThrow();
      });
    });
  });
});
