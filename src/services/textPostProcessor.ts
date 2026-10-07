/**
 * Text Post-Processing Service for HSA Exam Questions
 * 
 * 1. Unbreaks lines split across words/characters into continuous paragraphs.
 * 2. Unbreaks LaTeX formulas split across lines before KaTeX rendering.
 * 3. Identifies variation and sign tables (bảng xét dấu, bảng biến thiên)
 *    and converts them to clean HTML <table class="sign-table">.
 * 4. Preserves proper paragraph breaks, question numbers, options, and new sentences.
 */

/**
 * Checks if a line is a candidate for a sign / variation table row
 */
function isTableRowCandidate(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  if (!trimmed) return false;

  // Markdown table separator row: |---|---|:---:|
  if (/^\|?\s*[:\-\s|]{3,}\s*\|?$/.test(trimmed)) return true;

  // Row 1: x row: "x", "$x$", "| x |", "x |", "x:", "x\t"
  // Must not be a normal word like "xác suất", "xem", "xuất", "xét"
  if (/^\|?\s*(\$?x\$?)\s*([\|\:\t]|\s{2,}|\s*$)/i.test(trimmed)) {
    return true;
  }

  // Row 2: f'(x) or y' row: "f'(x)", "y'", "$f'(x)$", "$y'$", "f'", "g'(x)"
  if (/^\|?\s*(\$?(f'\s*\(\s*x\s*\)|y'|f'|g'\s*\(\s*x\s*\)|y\s*\\prime)\$?)\s*([\|\:\t]|\s{2,}|\s*$)/i.test(trimmed)) {
    return true;
  }

  // Row 3: f(x) or y row: "f(x)", "y", "$f(x)$", "$y$", "g(x)"
  // For 'y', ensure it's not a word like "yêu", "ý", "yên"
  if (/^\|?\s*(\$?(f\s*\(\s*x\s*\)|y|g\s*\(\s*x\s*\))\$?)\s*([\|\:\t]|\s{2,}|\s*$)/i.test(trimmed)) {
    return true;
  }

  // Row with pure signs, zeros, double bars, arrows
  // e.g. "+ | 0 | - | 0 | +" or "-∞ ↗ 3 ↘ -∞"
  if (/^[\|\s]*([+\-0\/\\|↗↘↑↓→]|\\nearrow|\\searrow|\$\s*[+\-0]\s*\$)+[\|\s]*$/.test(trimmed) && trimmed.length >= 3) {
    return true;
  }

  return false;
}

/**
 * Parses consecutive candidate lines into an HTML table with class "sign-table"
 */
function convertTableBlockToHtml(lines: string[]): string {
  if (lines.length === 0) return '';

  const rowsHtml: string[] = [];

  for (let rIdx = 0; rIdx < lines.length; rIdx++) {
    const rawLine = lines[rIdx].trim();
    // Skip markdown separator lines like |---|---|---|
    if (/^\|?\s*[:\-\s|]{3,}\s*\|?$/.test(rawLine)) continue;

    // Split by pipe '|', tab '\t', or multiple spaces (>=2)
    let cells: string[] = [];
    if (rawLine.includes('|')) {
      cells = rawLine
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
    } else if (rawLine.includes('\t')) {
      cells = rawLine.split('\t').map((c) => c.trim()).filter((c) => c.length > 0);
    } else {
      // Split by 2 or more spaces
      cells = rawLine.split(/\s{2,}/).map((c) => c.trim()).filter((c) => c.length > 0);
    }

    if (cells.length === 0) continue;

    const isFirstRow = rIdx === 0;
    const cellsHtml = cells
      .map((cell, cIdx) => {
        // First column in each row is the row label (x, f'(x), f(x))
        const isHeaderCell = isFirstRow || cIdx === 0;
        const tag = isHeaderCell ? 'th' : 'td';

        // Keep LaTeX formulas, arrows, signs
        let formattedCell = cell;
        // Standardize arrows and double bars if written in text
        formattedCell = formattedCell
          .replace(/->|-->|\\rightarrow|\\to/g, '→')
          .replace(/\\nearrow/g, '↗')
          .replace(/\\searrow/g, '↘');

        // Style double bar || nicely
        if (formattedCell === '||' || formattedCell === '| |') {
          return `<${tag} class="font-extrabold text-rose-500 tracking-tighter">||</${tag}>`;
        }

        return `<${tag}>${formattedCell}</${tag}>`;
      })
      .join('');

    rowsHtml.push(`<tr>${cellsHtml}</tr>`);
  }

  if (rowsHtml.length === 0) return '';
  return `<div class="overflow-x-auto my-3"><table class="sign-table"><tbody>${rowsHtml.join('')}</tbody></table></div>`;
}

/**
 * Detects and transforms sign tables / variation tables in text into HTML tables
 */
export function formatSignTables(text: string): string {
  if (!text) return '';
  // If already contains an HTML table, ensure it has sign-table class and wrapper
  if (/<table[\s>]/i.test(text)) {
    let normalized = text;
    if (!normalized.includes('sign-table')) {
      normalized = normalized.replace(/<table/gi, '<table class="sign-table"');
    }
    if (!normalized.includes('overflow-x-auto')) {
      normalized = normalized.replace(/(<table[\s\S]*?<\/table>)/gi, '<div class="overflow-x-auto my-3">$1</div>');
    }
    return normalized;
  }

  const rawLines = text.split('\n');
  const resultLines: string[] = [];
  let tableBuffer: string[] = [];

  const flushTableBuffer = () => {
    if (tableBuffer.length >= 2) {
      resultLines.push(convertTableBlockToHtml(tableBuffer));
    } else if (tableBuffer.length === 1) {
      resultLines.push(tableBuffer[0]);
    }
    tableBuffer = [];
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (isTableRowCandidate(trimmed)) {
      tableBuffer.push(trimmed);
    } else {
      flushTableBuffer();
      resultLines.push(line);
    }
  }

  flushTableBuffer();
  return resultLines.join('\n');
}

/**
 * Unbreaks LaTeX formulas that were split across lines:
 * e.g. `$ \n x^2 + 1 \n $` -> `$x^2 + 1$`
 * and merges split tokens inside math delimiters.
 */
export function unbreakLaTeXFormulas(text: string): string {
  if (!text) return '';

  let processed = text;

  // 1. Unbreak display math: $$ ... $$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula) => {
    const cleaned = formula
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .join(' ');
    return `$$${cleaned}$$`;
  });

  // 2. Unbreak LaTeX display math: \[ ... \]
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_match, formula) => {
    const cleaned = formula
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .join(' ');
    return `\\[${cleaned}\\]`;
  });

  // 3. Unbreak inline math: $ ... $
  processed = processed.replace(/\$([^\$]+?)\$/g, (match, formula) => {
    if (formula.includes('\n')) {
      const singleLine = formula
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(' ');
      return `$${singleLine}$`;
    }
    return match;
  });

  // 4. Unbreak LaTeX inline math: \( ... \)
  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (match, formula) => {
    if (formula.includes('\n')) {
      const singleLine = formula
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(' ');
      return `\\(${singleLine}\\)`;
    }
    return match;
  });

  return processed;
}

/**
 * Checks if a line starts a new valid block or sentence that should NOT be joined
 */
function isNewBlockStart(line: string, prevLine: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // 1. Option prefix: A. B. C. D. or A) B) C) D)
  if (/^[A-D]\s*[\.\)]/i.test(trimmed)) return true;

  // 2. Question prefix: "Câu 1", "Bài 2", "Ví dụ 3", "Câu hỏi 4"
  if (/^(Câu|Bài|Ví dụ|Câu hỏi)\s*\d+/i.test(trimmed)) return true;

  // 3. Numbered order: e.g. "1.", "1)", "(1)", "12."
  if (/^(\d+[\.\)\:]|\(\d+\))\s*/.test(trimmed)) return true;

  // 4. Bullet points: *, -, +, •
  if (/^[\*\-\+•]\s+/.test(trimmed)) return true;

  // 5. Section titles: "Phần 1", "Chủ đề", "Đề bài", "Hướng dẫn", "Lời giải", "Bảng"
  if (/^(Phần\s+\d+|Chủ đề|Chuyên đề|Đề bài|Hướng dẫn|Lời giải|Ghi chú|Bảng\s+\d+|Bảng xét dấu|Bảng biến thiên)/i.test(trimmed)) {
    return true;
  }

  // 6. HTML tags: <table, <div, <p, etc.
  if (/^<\/?[a-z]/i.test(trimmed)) return true;

  // 7. Check if prevLine ended with a period (. ! ?) and currentLine starts with a Capital letter (new sentence!)
  const prevTrimmed = prevLine.trim();
  if (prevTrimmed) {
    // If previous line ends with a period, exclamation, question mark (optionally followed by quotes/brackets)
    if (/[\.\!\?]["'\)\]\}]?$/.test(prevTrimmed)) {
      // If current line starts with an uppercase letter (Latin or Vietnamese) -> New sentence, DO NOT MERGE!
      if (/^[A-ZÀ-ỸĐ]/.test(trimmed)) {
        return true;
      }
    }
  }

  // 8. If previous line was empty (explicit paragraph break)
  if (!prevTrimmed) return true;

  return false;
}

/**
 * Merges broken lines of text into continuous paragraphs
 */
export function mergeBrokenLines(text: string): string {
  if (!text) return '';

  // 1. Unbreak multi-line LaTeX formulas first so formula delimiters are contiguous
  const withFormulas = unbreakLaTeXFormulas(text);

  // 2. Identify and convert sign tables / variation tables into HTML tables
  const withTables = formatSignTables(withFormulas);

  const lines = withTables.split('\n');
  const merged: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const trimmed = current.trim();

    // If empty line, preserve as paragraph break
    if (!trimmed) {
      merged.push('');
      continue;
    }

    if (merged.length === 0) {
      merged.push(trimmed);
      continue;
    }

    const prevIndex = merged.length - 1;
    const prev = merged[prevIndex];

    // If either line is inside an HTML tag, don't merge
    if (
      prev.includes('<table') ||
      prev.includes('</table>') ||
      trimmed.includes('<table') ||
      trimmed.includes('</table>') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('</div>')
    ) {
      merged.push(trimmed);
      continue;
    }

    // Check if current line should start a new block
    if (isNewBlockStart(current, prev)) {
      merged.push(trimmed);
    } else {
      // Merge with previous line into a continuous sentence!
      // Handle word hyphenation at end of line (e.g., "khảo-" + "sát" -> "khảo sát")
      if (prev.endsWith('-')) {
        merged[prevIndex] = prev.slice(0, -1) + trimmed;
      } else {
        merged[prevIndex] = prev + ' ' + trimmed;
      }
    }
  }

  return merged.join('\n');
}

/**
 * Master cleaner function to be run on all question text fields
 */
export function cleanAndFormatQuestionText(text: string): string {
  if (!text) return '';
  return mergeBrokenLines(text);
}

/**
 * Post-processes an entire question object before saving
 */
export function postProcessQuestion<T extends {
  questionText: string;
  groupContent?: string;
  options?: string[];
  explanation?: string;
}>(q: T): T {
  return {
    ...q,
    questionText: cleanAndFormatQuestionText(q.questionText || ''),
    groupContent: q.groupContent ? cleanAndFormatQuestionText(q.groupContent) : q.groupContent,
    explanation: q.explanation ? cleanAndFormatQuestionText(q.explanation) : q.explanation,
    options: Array.isArray(q.options)
      ? q.options.map((opt) => cleanAndFormatQuestionText(opt || ''))
      : q.options,
  };
}

