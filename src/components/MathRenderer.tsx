import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders LaTeX formulas inside HTML table cells (sign-table / variation table)
 */
function renderSignTableBlock(tableHtml: string): string {
  // Process any $...$ or $$...$$ inside <td> or <th>
  return tableHtml.replace(/<(t[hd])([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, tag, attrs, cellContent) => {
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$]+?\$|\\\([\s\S]*?\\\))/g;
    const processedCell = cellContent.replace(mathRegex, (mathMatch: string) => {
      let formula = mathMatch;
      let displayMode = false;
      if (formula.startsWith('$$') && formula.endsWith('$$')) {
        formula = formula.slice(2, -2).trim();
        displayMode = true;
      } else if (formula.startsWith('\\[') && formula.endsWith('\\]')) {
        formula = formula.slice(2, -2).trim();
        displayMode = true;
      } else if (formula.startsWith('$') && formula.endsWith('$')) {
        formula = formula.slice(1, -1).trim();
      } else if (formula.startsWith('\\(') && formula.endsWith('\\)')) {
        formula = formula.slice(2, -2).trim();
      }

      try {
        return katex.renderToString(formula, {
          displayMode,
          throwOnError: false,
        });
      } catch {
        return mathMatch;
      }
    });

    return `<${tag}${attrs}>${processedCell}</${tag}>`;
  });
}

/**
 * Renders standard text parts with LaTeX formulas
 */
function renderTextWithMath(text: string): string {
  if (!text) return '';

  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
  const parts = text.split(regex);

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
          return `<span class="text-rose-500 font-mono">${escapeHtml(part)}</span>`;
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
          return `<span class="text-rose-500 font-mono">${escapeHtml(part)}</span>`;
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
          return `<span class="text-rose-500 font-mono">${escapeHtml(part)}</span>`;
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
          return `<span class="text-rose-500 font-mono">${escapeHtml(part)}</span>`;
        }
      }

      // Normal text - preserve line breaks and sanitize HTML
      return escapeHtml(part).replace(/\n/g, '<br />');
    })
    .join('');
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Split content into HTML table blocks (sign-table / variation tables) and regular text
    const tableBlockRegex = /(<div[^>]*class="[^"]*overflow-x-auto[^"]*"[^>]*>[\s\S]*?<\/div>|<table[\s\S]*?<\/table>)/gi;
    const segments = content.split(tableBlockRegex);

    return segments
      .map((segment) => {
        if (!segment) return '';

        // If this segment is an HTML table block
        if (/<table[\s>]/i.test(segment)) {
          return renderSignTableBlock(segment);
        }

        // Standard text with LaTeX math
        return renderTextWithMath(segment);
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

