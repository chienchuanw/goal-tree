export type FlatNote = {
  id: string;
  parentId: string | null;
  title: string;
  depth: number;
  goalId: string | null;
  updatedAt: Date;
};

export type NoteNode = {
  id: string;
  title: string;
  depth: number;
  goalId: string | null;
  updatedAt: Date;
  children: NoteNode[];
};

/**
 * Build the input shape `assembleTree` expects from a Drizzle `notes` row.
 * Anything with the FlatNote-compatible fields works.
 */
export function flatNoteOf(n: {
  id: string;
  parentId: string | null;
  title: string;
  depth: number;
  goalId: string | null;
  updatedAt: Date;
}): FlatNote {
  return {
    id: n.id,
    parentId: n.parentId,
    title: n.title,
    depth: n.depth,
    goalId: n.goalId,
    updatedAt: n.updatedAt,
  };
}

/** Depth-first search for a node by id; null when missing. */
export function findInTree(list: NoteNode[], id: string): NoteNode | null {
  for (const n of list) {
    if (n.id === id) return n;
    const found = findInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

/** Highest `depth` value in the subtree rooted at `node`. */
export function maxDepth(node: NoteNode): number {
  let m = node.depth;
  for (const c of node.children) m = Math.max(m, maxDepth(c));
  return m;
}

/** All ids in the subtree rooted at `node`, in DFS order. */
export function collectIds(node: NoteNode, into: string[] = []): string[] {
  into.push(node.id);
  for (const c of node.children) collectIds(c, into);
  return into;
}

function compareTitle(a: NoteNode, b: NoteNode): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function assembleTree(rows: ReadonlyArray<FlatNote>): NoteNode[] {
  const nodesById = new Map<string, NoteNode>();
  for (const r of rows) {
    nodesById.set(r.id, {
      id: r.id,
      title: r.title,
      depth: r.depth,
      goalId: r.goalId,
      updatedAt: r.updatedAt,
      children: [],
    });
  }

  const roots: NoteNode[] = [];
  for (const r of rows) {
    const node = nodesById.get(r.id)!;
    if (r.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodesById.get(r.parentId);
      if (!parent) continue; // orphan — defensive drop
      parent.children.push(node);
    }
  }

  // Sort siblings at every level.
  const sortRecursive = (list: NoteNode[]) => {
    list.sort(compareTitle);
    for (const n of list) sortRecursive(n.children);
  };
  sortRecursive(roots);

  return roots;
}
