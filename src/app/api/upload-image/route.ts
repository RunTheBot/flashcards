import { auth } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

const CDN_UPLOAD_URL = "https://cdn.hackclub.com/api/upload";

export async function POST(req: NextRequest) {
	try {
		// Check authentication
		const session = await auth.api.getSession({ headers: req.headers });
		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Check if CDN token is configured
		if (!process.env.HACKCLUB_CDN_TOKEN) {
			return NextResponse.json(
				{ error: "CDN upload not configured" },
				{ status: 503 },
			);
		}

		// Get the image data URL from request body
		const { dataUrl, filename } = await req.json();

		if (!dataUrl || typeof dataUrl !== "string") {
			return NextResponse.json(
				{ error: "Invalid image data" },
				{ status: 400 },
			);
		}

		// Convert data URL to blob
		const base64Data = dataUrl.split(",")[1];
		if (!base64Data) {
			return NextResponse.json(
				{ error: "Invalid data URL format" },
				{ status: 400 },
			);
		}

		const buffer = Buffer.from(base64Data, "base64");

		// Determine content type from data URL
		const mimeMatch = dataUrl.match(/^data:([^;]+);/);
		const contentType = mimeMatch?.[1] || "image/png";

		// Create a temporary blob URL for the CDN to fetch
		// Since CDN /api/upload expects a URL, we need to use the v3/new endpoint with base64
		// Or better: Convert to a proper image URL by uploading via multipart

		// Actually, looking at the CDN code, /api/upload expects a URL string
		// We need to upload the file directly using their storage method
		// For now, let's use the v3/new endpoint which accepts URLs

		// Create a data URL that can be fetched
		// Alternative: Store temp file and provide URL, but that's complex
		// Better: Use the v3/new endpoint which we already have

		// Upload via v3/new endpoint (handles URLs)
		const response = await fetch("https://cdn.hackclub.com/api/v3/new", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.HACKCLUB_CDN_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify([dataUrl]),
		});

		if (!response.ok) {
			const error = await response.text();
			console.error("CDN upload failed:", error);
			return NextResponse.json(
				{ error: "Failed to upload to CDN" },
				{ status: response.status },
			);
		}

		const result = await response.json();

		// Extract the first uploaded file
		const uploadedFile = result.files?.[0];
		if (!uploadedFile) {
			return NextResponse.json(
				{ error: "No file returned from CDN" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			url: uploadedFile.deployedUrl,
			sha: uploadedFile.sha,
			size: uploadedFile.size,
		});
	} catch (error) {
		console.error("Image upload error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
