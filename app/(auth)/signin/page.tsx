import { signIn } from '@/lib/auth';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <form
        action={async () => {
          'use server';
          await signIn('github', { redirectTo: '/today' });
        }}
        className="flex flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold">goal-tree</h1>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800"
        >
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
