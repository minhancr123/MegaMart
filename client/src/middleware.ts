import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that require authentication
const protectedRoutes = ['/profile', '/checkout', '/orders'];
// Routes that require ADMIN role
const adminRoutes = ['/admin'];
// Routes that should redirect to home if already logged in
const authRoutes = ['/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookies or Authorization header
  const token = request.cookies.get('token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');

  // Check if route is admin
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  // Check if route is auth page
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If no token and trying to access protected/admin routes
  if (!token && (isProtectedRoute || isAdminRoute)) {
    const url = new URL('/auth', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // If token exists, verify it
  if (token) {
    try {
      // Ensure the JWT secret is available in the Edge runtime.
      const secretString = process.env.JWT_SECRET;
      if (!secretString) {
        // Don't print the secret — just note it's missing.
        console.error('middleware: JWT_SECRET is not set in the Edge runtime. Aborting verification.');
        // Redirect to auth and clear token to force re-login.
        const response = NextResponse.redirect(new URL('/auth', request.url));
        response.cookies.delete('token');
        return response;
      }

      const secret = new TextEncoder().encode(secretString);
      console.log('middleware: JWT_SECRET is set, proceeding with verification.');
      const { payload } = await jwtVerify(token, secret);
      
      // Check if user is admin for admin routes
      if (isAdminRoute && payload.role !== 'ADMIN') {
        // Not an admin, redirect to home
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // If logged in and trying to access auth page, redirect to home
      if (isAuthRoute) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // Add user info to request headers for server components
      const response = NextResponse.next();
      response.headers.set('x-user-id', payload.sub as string);
      response.headers.set('x-user-role', payload.role as string);
      return response;
      
    } catch (error) {
      // Token is invalid or expired
      console.error('JWT verification failed:', error);
      // Dev-only: log token snippet (do not log the full token)
      try {
        console.error('middleware: token seen by middleware, len=', token?.length, 'head=', token?.slice(0,8), 'tail=', token?.slice(-8));
      } catch (e) {}

      // Clear invalid token and redirect to auth
      const response = NextResponse.redirect(new URL('/auth', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images folder (all images)
     * - models folder (3D models: gltf, glb, bin)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|models).*)',
  ],
};
