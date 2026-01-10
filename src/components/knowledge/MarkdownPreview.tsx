import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  content: string;
  onDocLinkClick?: (docId: string) => void;
}

export function MarkdownPreview({ content, onDocLinkClick }: MarkdownPreviewProps) {
  // Parse [[doc-id|title]] style links
  const processedContent = content.replace(
    /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
    (_, docId, title) => `[📄 ${title}](#doc:${docId})`
  );

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold mt-8 mb-4 first:mt-0 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="my-3 leading-relaxed text-foreground">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-3 ml-6 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 ml-6 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children, ...props }) => {
          // Handle checkbox items from GFM
          const className = props.className;
          if (className?.includes("task-list-item")) {
            return <li className="list-none ml-[-1.5rem] flex items-start gap-2">{children}</li>;
          }
          return <li className="text-foreground">{children}</li>;
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground bg-secondary/30 py-2 rounded-r">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-secondary text-primary font-mono text-sm">
                {children}
              </code>
            );
          }
          return (
            <code className={cn("block p-4 rounded-lg bg-secondary/50 overflow-x-auto font-mono text-sm", className)}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-4 rounded-lg bg-secondary/50 overflow-hidden">{children}</pre>
        ),
        a: ({ href, children }) => {
          // Handle internal doc links
          if (href?.startsWith("#doc:")) {
            const docId = href.replace("#doc:", "");
            return (
              <button
                onClick={() => onDocLinkClick?.(docId)}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                {children}
              </button>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          );
        },
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-secondary/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-border px-4 py-2 text-left font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-4 py-2">{children}</td>
        ),
        hr: () => <hr className="my-6 border-border" />,
        input: ({ type, checked, ...props }) => {
          if (type === "checkbox") {
            return (
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            );
          }
          return <input type={type} {...props} />;
        },
      }}
    >
      {processedContent}
    </ReactMarkdown>
    </div>
  );
}
