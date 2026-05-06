/**
 * Shared discriminated union for `useActionState`-driven server actions
 * that return an id on success.
 */
export type FormActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; id: string };
