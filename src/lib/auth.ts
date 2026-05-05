import NextAuth, { type DefaultSession } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { env } from '@/lib/env';

declare module 'next-auth' {
  interface Session {
    user: { id: string; githubId: string } & DefaultSession['user'];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: env().AUTH_GITHUB_ID,
      clientSecret: env().AUTH_GITHUB_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
    error: '/not-authorized',
  },
  callbacks: {
    async signIn({ profile }) {
      const githubId = String(profile?.id ?? '');
      if (!githubId || githubId !== env().ALLOWED_GITHUB_ID) return false;

      // Upsert user row.
      const existing = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({
          githubId,
          name: (profile?.name as string | undefined) ?? null,
          imageUrl: (profile?.avatar_url as string | undefined) ?? null,
        });
      }
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.id) {
        const githubId = String(profile.id);
        const [u] = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
        if (u) {
          token.userId = u.id;
          token.githubId = u.githubId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && token.githubId) {
        session.user.id = token.userId as string;
        session.user.githubId = token.githubId as string;
      }
      return session;
    },
  },
});
