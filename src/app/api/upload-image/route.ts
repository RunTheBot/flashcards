import { auth } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

const CDN_UPLOAD_URL = "https://cdn.hackclub.com/api/upload";

/**
 * Handle file upload to Hack Club CDN
 * Similar to Hack Club's upload endpoint handler
 */
async function handleUpload(req: NextRequest) {
	try {
		// Get the image data URL from request body
		const { dataUrl, filename } = await req.json();

		if (!dataUrl || typeof dataUrl !== "string") {
			return {
				status: 400,
				body: { error: "Invalid image data" },
			};
		}

		// Convert data URL to buffer
		const base64Data = dataUrl.split(",")[1];
		if (!base64Data) {
			return {
				status: 400,
				body: { error: "Invalid data URL format" },
			};
		}

		const buffer = Buffer.from(base64Data, "base64");

		// Determine content type from data URL
		const mimeMatch = dataUrl.match(/^data:([^;]+);/);
		const contentType = mimeMatch?.[1] || "image/png";

		console.log("Uploading image to CDN:", {
			filename,
			contentType,
			size: buffer.length,
		});

		// Create FormData for multipart upload
		const formData = new FormData();
		const blob = new Blob([buffer], { type: contentType });
		formData.append("file", blob, filename || "image.png");

		// Upload to Hack Club CDN
		const response = await fetch(CDN_UPLOAD_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.HACKCLUB_CDN_TOKEN}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const error = await response.text();
			console.error("CDN upload failed:", error);
			return {
				status: response.status,
				body: { error: "Failed to upload to CDN" },
			};
		}

		const result = await response.json();

		return {
			status: 200,
			body: {
				url: result.url || result.deployedUrl,
				sha: result.sha,
				size: result.size,
			},
		};
	} catch (error) {
		console.error("Upload handler error:", error);
		return {
			status: 500,
			body: { error: "Storage upload failed" },
		};
	}
}

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

		// Use Hack Club's upload handler pattern
		const result = await handleUpload(req);
		return NextResponse.json(result.body, { status: result.status });
	} catch (error) {
		console.error("Image upload error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
