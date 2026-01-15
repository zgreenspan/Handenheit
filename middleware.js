import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the password from environment variable
  const SITE_PASSWORD = process.env.SITE_PASSWORD || 'changeme';

  // Check if user has valid auth cookie
  const authCookie = request.cookies.get('site-auth');

  if (authCookie?.value === SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Check if this is a login attempt
  const url = new URL(request.url);
  if (url.pathname === '/login' && request.method === 'POST') {
    return NextResponse.next();
  }

  // Check for Basic Auth header
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const auth = authHeader.split(' ')[1];
    const [user, pass] = Buffer.from(auth, 'base64').toString().split(':');

    if (pass === SITE_PASSWORD) {
      const response = NextResponse.next();
      response.cookies.set('site-auth', pass, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      return response;
    }
  }

  // Redirect to login page
  if (url.pathname !== '/login.html') {
    return NextResponse.rewrite(new URL('/login.html', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|login.html).*)']
};
