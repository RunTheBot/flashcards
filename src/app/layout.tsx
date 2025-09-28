import "@/styles/globals.css";

import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Header } from "@/components/header";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
	title: "Flashcards by Aaron",
	description:
		"AI-powered spaced repetition flashcard app with FSRS V6 (Default)",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<body>
				<TRPCReactProvider>
					<Header />
					{children}
					<Toaster />
				</TRPCReactProvider>
			</body>
		</html>
	);
}
