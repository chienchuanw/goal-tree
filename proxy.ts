import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;

  const isPublic =
    nextUrl.pathname.startsWith('/signin') ||
    nextUrl.pathname.startsWith('/not-authorized') ||
    nextUrl.pathname.startsWith('/api/auth');

  if (!isAuthed && !isPublic) {
    const url = new URL('/signin', nextUrl);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Match everything except Next internals + static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)).*)'],
};
