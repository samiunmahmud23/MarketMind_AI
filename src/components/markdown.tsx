"use client";

import ReactMarkdown from "react-markdown";

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`report-prose text-sm leading-relaxed ${className || ""}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
