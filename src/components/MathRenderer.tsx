import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Regex to split on $$...$$, $...$, \[...\], \(...\)
    // We capture delimiters to know if it's display or inline mode
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
    const parts = content.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        // Block math: $$ ... $$ or \[ ... \]
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            return `<div class="my-2.5 overflow-x-auto text-center py-1">${katex.renderToString(math, {
              displayMode: true,
              throwOnError: false,
            })}</div>`;
          } catch {
            return `<span class="text-rose-500 font-mono">${part}</span>`;
          }
        }

        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          const math = part.slice(2, -2).trim();
          try {
            return `<div class="my-2.5 overflow-x-auto text-center py-1">${katex.renderToString(math, {
              displayMode: true,
              throwOnError: false,
            })}</div>`;
          } catch {
            return `<span class="text-rose-500 font-mono">${part}</span>`;
          }
        }

        // Inline math: $ ... $ or \( ... \)
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1).trim();
          try {
            return katex.renderToString(math, {
              displayMode: false,
              throwOnError: false,
            });
          } catch {
            return `<span class="text-rose-500 font-mono">${part}</span>`;
          }
        }

        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          const math = part.slice(2, -2).trim();
          try {
            return katex.renderToString(math, {
              displayMode: false,
              throwOnError: false,
            });
          } catch {
            return `<span class="text-rose-500 font-mono">${part}</span>`;
          }
        }

        // Normal text - preserve line breaks and sanitize HTML
        return escapeHtml(part).replace(/\n/g, '<br />');
      })
      .join('');
  }, [content]);

  return (
    <div
      className={`leading-relaxed break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
