import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizer';

interface RichTextViewerProps {
  content: string;
  className?: string;
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Cek apakah ada format HTML (seperti <b>, <sup>, dll)
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (!hasHtml) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
        {content}
      </div>
    );
  }

  const clean = sanitizeHtml(content);

  return (
    <div
      className={`prose prose-slate max-w-none text-slate-800 leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>code]:bg-slate-100 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-emerald-700 [&>code]:font-mono [&>code]:text-xs [&>sup]:text-xs [&>sup]:font-semibold [&>sub]:text-xs ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};
