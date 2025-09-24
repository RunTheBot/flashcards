import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
	// Check if the request is for a dashboard route
	if (request.nextUrl.pathname.startsWith("/dashboard")) {
		try {
			// Get the session from the request
			const session = await auth.api.getSession({
				headers: request.headers,
			});

			// If no session exists, redirect to sign-in
			if (!session) {
				const signInUrl = new URL("/auth/signin", request.url);
				signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
				return NextResponse.redirect(signInUrl);
			}
		} catch (error) {
			// If there's an error getting the session, redirect to sign-in
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
