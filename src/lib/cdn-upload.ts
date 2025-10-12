"use server";

/**
 * Upload images from markdown to Hack Club CDN
 * Parses markdown for image URLs and uploads them to cdn.hackclub.com
 */

const CDN_API_URL = "https://cdn.hackclub.com/api/v3/new";

interface CDNUploadResponse {
	files: Array<{
		deployedUrl: string;
		file: string;
		sha: string;
		size: number;
	}>;
	cdnBase: string;
}

/**
 * Extract image URLs from markdown text
 */
function extractImageUrls(markdown: string): string[] {
	// Match markdown image syntax: ![alt](url)
	const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
	const urls: string[] = [];

	for (const match of markdown.matchAll(imageRegex)) {
		const url = match[2];
		// Only process external URLs (not already on CDN)
		if (url && !url.startsWith("data:") && !url.includes("cdn.hackclub.com")) {
			urls.push(url.trim());
		}
	}

	return urls;
}

/**
 * Upload images to Hack Club CDN
 */
async function uploadToCDN(imageUrls: string[]): Promise<Map<string, string>> {
	if (imageUrls.length === 0) {
		return new Map();
	}

	try {
		const response = await fetch(CDN_API_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.HACKCLUB_CDN_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(imageUrls),
		});

		if (!response.ok) {
			throw new Error(`CDN upload failed: ${response.statusText}`);
		}

		const data = (await response.json()) as CDNUploadResponse;

		// Create a mapping of original URL to CDN URL
		const urlMap = new Map<string, string>();
		for (let i = 0; i < imageUrls.length; i++) {
			const originalUrl = imageUrls[i];
			const cdnFile = data.files[i];
			if (originalUrl && cdnFile) {
				urlMap.set(originalUrl, cdnFile.deployedUrl);
			}
		}

		return urlMap;
	} catch (error) {
		console.error("Failed to upload to CDN:", error);
		// Return empty map on error - images will remain as-is
		return new Map();
	}
}

/**
 * Replace image URLs in markdown with CDN URLs
 */
function replaceImageUrls(
	markdown: string,
	urlMap: Map<string, string>,
): string {
	let result = markdown;

	for (const [originalUrl, cdnUrl] of urlMap) {
		// Replace all occurrences of the original URL with the CDN URL
		result = result.replaceAll(originalUrl, cdnUrl);
	}

	return result;
}

/**
 * Process markdown: extract images, upload to CDN, and replace URLs
 * @param markdown - The markdown text to process
 * @returns The markdown with image URLs replaced by CDN URLs
 */
export async function processMarkdownImages(markdown: string): Promise<string> {
	// Skip if no CDN token configured
	if (!process.env.HACKCLUB_CDN_TOKEN) {
		console.warn("HACKCLUB_CDN_TOKEN not configured, skipping CDN upload");
		return markdown;
	}

	// Extract image URLs from markdown
	const imageUrls = extractImageUrls(markdown);

	if (imageUrls.length === 0) {
		return markdown;
	}

	console.log(`Found ${imageUrls.length} image(s) to upload to CDN`);

	// Upload images to CDN
	const urlMap = await uploadToCDN(imageUrls);

	// Replace URLs in markdown
	const processedMarkdown = replaceImageUrls(markdown, urlMap);

	console.log(`Uploaded ${urlMap.size} image(s) to CDN`);

	return processedMarkdown;
}
