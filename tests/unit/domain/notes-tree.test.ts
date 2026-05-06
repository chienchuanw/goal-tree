import { describe, it, expect } from 'vitest';
import { assembleTree, type FlatNote } from '@/domain/notes-tree';

const ts = new Date('2026-05-06T00:00:00Z');

const row = (overrides: Partial<FlatNote>): FlatNote => ({
  id: overrides.id ?? 'id',
  parentId: overrides.parentId ?? null,
  title: overrides.title ?? 'untitled',
  depth: overrides.depth ?? 0,
  goalId: overrides.goalId ?? null,
  updatedAt: overrides.updatedAt ?? ts,
});

describe('assembleTree', () => {
  describe('Given an empty input', () => {
    describe('When called', () => {
      it('Then returns an empty array', () => {
        expect(assembleTree([])).toEqual([]);
      });
    });
  });

  describe('Given a single root note', () => {
    describe('When called', () => {
      it('Then returns one node with no children', () => {
        const tree = assembleTree([row({ id: 'a', title: 'A', depth: 0 })]);
        expect(tree).toHaveLength(1);
        expect(tree[0]!.id).toBe('a');
        expect(tree[0]!.children).toEqual([]);
      });
    });
  });

  describe('Given a depth-2 chain root → child → grandchild', () => {
    describe('When called', () => {
      it('Then returns one root with one child with one grandchild', () => {
        const tree = assembleTree([
          row({ id: 'r', title: 'root', depth: 0 }),
          row({ id: 'c', parentId: 'r', title: 'child', depth: 1 }),
          row({ id: 'g', parentId: 'c', title: 'grand', depth: 2 }),
        ]);
        expect(tree).toHaveLength(1);
        expect(tree[0]!.children).toHaveLength(1);
        expect(tree[0]!.children[0]!.children).toHaveLength(1);
        expect(tree[0]!.children[0]!.children[0]!.id).toBe('g');
      });
    });
  });

  describe('Given multiple roots', () => {
    describe('When called', () => {
      it('Then all appear at the top level', () => {
        const tree = assembleTree([
          row({ id: 'r1', title: 'one', depth: 0 }),
          row({ id: 'r2', title: 'two', depth: 0 }),
        ]);
        expect(tree.map((n) => n.id).sort()).toEqual(['r1', 'r2']);
      });
    });
  });

  describe('Given sibling notes with mixed-case titles', () => {
    describe('When called', () => {
      it('Then siblings are ordered case-insensitively ascending', () => {
        const tree = assembleTree([
          row({ id: 'b', title: 'Beta', depth: 0 }),
          row({ id: 'a', title: 'alpha', depth: 0 }),
          row({ id: 'g', title: 'Gamma', depth: 0 }),
        ]);
        expect(tree.map((n) => n.title)).toEqual(['alpha', 'Beta', 'Gamma']);
      });
    });
  });

  describe('Given a child whose parent is missing from the rows', () => {
    describe('When called', () => {
      it('Then the orphan is dropped (defensive: should not happen in normal flow)', () => {
        const tree = assembleTree([
          row({ id: 'orphan', parentId: 'missing', depth: 1, title: 'orphan' }),
        ]);
        expect(tree).toEqual([]);
      });
    });
  });

  describe('Given children at different depths under the same parent', () => {
    describe('When called', () => {
      it('Then siblings are sorted by title within each parent', () => {
        const tree = assembleTree([
          row({ id: 'r', title: 'root', depth: 0 }),
          row({ id: 'c2', parentId: 'r', title: 'Charlie', depth: 1 }),
          row({ id: 'c1', parentId: 'r', title: 'alpha', depth: 1 }),
        ]);
        expect(tree[0]!.children.map((c) => c.title)).toEqual(['alpha', 'Charlie']);
      });
    });
  });
});
