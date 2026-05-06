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
