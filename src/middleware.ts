import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
	// Check if the request is for a dashboard route
	if (request.nextUrl.pathname.startsWith("/dashboard")) {
		// Check for session cookie using Better Auth utility
		const sessionCookie = getSessionCookie(request);
		
		// If no session cookie exists, redirect to sign-in
		if (!sessionCookie) {
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
