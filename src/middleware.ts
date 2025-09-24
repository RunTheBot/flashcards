import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	// Check if the request is for a dashboard route
	if (request.nextUrl.pathname.startsWith("/dashboard")) {
		// Check for session cookie (Better Auth uses 'better-auth.session_token' by default)
		const sessionCookie = request.cookies.get("better-auth.session_token");
		
		// If no session cookie exists, redirect to sign-in
		if (!sessionCookie || !sessionCookie.value) {
			const signInUrl = new URL("/auth/signin", request.url);
			signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
			return NextResponse.redirect(signInUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
