import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
	content: string;
	className?: string;
}

export function MarkdownRenderer({
	content,
	className,
}: MarkdownRendererProps) {
	return (
		<div className={className}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					// Customize rendered elements for better styling
					p: ({ children }) => <p className="mb-2">{children}</p>,
					h1: ({ children }) => (
						<h1 className="mb-2 font-bold text-2xl">{children}</h1>
					),
					h2: ({ children }) => (
						<h2 className="mb-2 font-bold text-xl">{children}</h2>
					),
					h3: ({ children }) => (
						<h3 className="mb-2 font-semibold text-lg">{children}</h3>
					),
					ul: ({ children }) => (
						<ul className="mb-2 ml-4 list-disc">{children}</ul>
					),
					ol: ({ children }) => (
						<ol className="mb-2 ml-4 list-decimal">{children}</ol>
					),
					li: ({ children }) => <li className="mb-1">{children}</li>,
					code: ({ children, className }) => {
						const isInline = !className;
						return isInline ? (
							<code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
								{children}
							</code>
						) : (
							<code className={className}>{children}</code>
						);
					},
					pre: ({ children }) => (
						<pre className="mb-2 overflow-x-auto rounded bg-muted p-2">
							{children}
						</pre>
					),
					blockquote: ({ children }) => (
						<blockquote className="mb-2 border-muted-foreground border-l-4 pl-4 italic">
							{children}
						</blockquote>
					),
					a: ({ href, children }) => (
						<a
							href={href}
							className="text-primary underline hover:text-primary/80"
							target="_blank"
							rel="noopener noreferrer"
						>
							{children}
						</a>
					),
					strong: ({ children }) => (
						<strong className="font-bold">{children}</strong>
					),
					em: ({ children }) => <em className="italic">{children}</em>,
					img: ({ src, alt }) => (
						<img
							src={src}
							alt={alt}
							className="mx-auto my-2 max-h-96 w-auto rounded-lg object-contain shadow-md"
						/>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
