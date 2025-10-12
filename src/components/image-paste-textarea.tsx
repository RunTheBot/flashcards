"use client";

import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2 } from "lucide-react";
import {
	type ChangeEvent,
	type ClipboardEvent,
	type TextareaHTMLAttributes,
	useState,
} from "react";
import { toast } from "sonner";

interface ImagePasteTextareaProps
	extends Omit<
		TextareaHTMLAttributes<HTMLTextAreaElement>,
		"onPaste" | "onChange"
	> {
	value: string;
	onChange: (value: string) => void;
}

export function ImagePasteTextarea({
	value,
	onChange,
	...props
}: ImagePasteTextareaProps) {
	const [isUploading, setIsUploading] = useState(false);

	const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData?.items;
		if (!items) return;

		// Check for image in clipboard
		for (const item of Array.from(items)) {
			if (item.type.startsWith("image/")) {
				e.preventDefault();

				const file = item.getAsFile();
				if (!file) continue;

				// Capture textarea reference and selection position BEFORE async operations
				const textarea = e.currentTarget;
				const start = textarea.selectionStart;
				const end = textarea.selectionEnd;

				setIsUploading(true);
				toast.info("Uploading image to CDN...");

				try {
					// Convert file to data URL
					const reader = new FileReader();
					const dataUrl = await new Promise<string>((resolve, reject) => {
						reader.onload = () => resolve(reader.result as string);
						reader.onerror = reject;
						reader.readAsDataURL(file);
					});

					// Upload to CDN via our API
					const response = await fetch("/api/upload-image", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							dataUrl,
							filename: file.name || "pasted-image.png",
						}),
					});

					if (!response.ok) {
						throw new Error("Upload failed");
					}

					const result = await response.json();

					// Insert markdown image syntax at cursor position
					const before = value.substring(0, start);
					const after = value.substring(end);

					const imageMarkdown = `![Image](${result.url})`;
					const newValue = before + imageMarkdown + after;

					onChange(newValue);

					// Move cursor after the inserted markdown
					setTimeout(() => {
						textarea.selectionStart = textarea.selectionEnd =
							start + imageMarkdown.length;
						textarea.focus();
					}, 0);

					toast.success("Image uploaded successfully!");
				} catch (error) {
					console.error("Image upload error:", error);
					toast.error(
						"Failed to upload image. Try again or paste a URL instead.",
					);
				} finally {
					setIsUploading(false);
				}

				// Only handle the first image
				break;
			}
		}
	};

	return (
		<div className="relative">
			<Textarea
				{...props}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onPaste={handlePaste}
				disabled={isUploading || props.disabled}
			/>
			{isUploading && (
				<div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/80">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Uploading image...</span>
					</div>
				</div>
			)}
			{!isUploading && (
				<div className="absolute top-2 right-2 text-muted-foreground text-xs">
					<ImageIcon className="h-4 w-4" />
				</div>
			)}
		</div>
	);
}
