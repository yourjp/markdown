import { HeadingItem } from '../types';

/**
 * Strips existing numbering, bullets, and section prefixes from heading titles.
 * Examples stripped:
 * - Numbers: "1. Title", "1.1 Title", "1.1. Title", "1.2.3 Title", "1) Title", "(1) Title", "[1] Title", "1 - Title"
 * - Letters: "A. Title", "a) Title", "(A) Title", "[a] Title", "B: Title"
 * - Roman numerals: "I. Title", "IV. Title", "ii) Title", "(III) Title"
 * - Korean / Asian: "가. 제목", "(가) 제목", "1.1) 제목", "일. 제목", "① 제목", "⑴ 제목", "❶ 제목"
 * - Keywords: "Step 1. Setup", "Phase 1: Planning", "Chapter 1. Intro", "Section 1 - Overview", "제1장 총칙", "제 1 절 정의"
 *
 * Preserves normal words/titles such as:
 * - "2024년 결산", "3D 그래픽", "C++ 가이드", "iOS 18 업데이트", "100가지 팁", "AI 도입 전략"
 */
export function stripHeadingNumbering(title: string): string {
  if (!title) return '';
  let cleaned = title.trim();

  let prev = '';
  // Loop to handle chained prefixes like "Chapter 1. A. 1) Title"
  while (cleaned && cleaned !== prev) {
    prev = cleaned;

    // 1. Special circled numbers, parenthesized numbers/hangul (①~⑳, ⑴~⒇, ⒈~⒛, ❶~➓, ㈀~㈍, ㈠~㈩)
    cleaned = cleaned.replace(/^[①-⑳⑴-⒇⒈-⒛❶-➓㈀-㈍㈠-㈩]\s*[:.\-–—]?\s*/u, '');

    // 2. Korean Chapter/Section headers (제1장, 제 1 장, 제1절, 제 1 조, 제1편 등)
    cleaned = cleaned.replace(/^제\s*\d+\s*[장절조편회강단계목]\s*[:.\-–—]?\s*/u, '');

    // 3. Keyword prefixes (Step 1, Phase 1, Chapter 1, Section 1, Part 1, Task 1, Item 1, Day 1, Week 1, No. 1, etc.)
    cleaned = cleaned.replace(
      /^(?:Step|Phase|Chapter|Section|Part|Task|Item|No|Case|Session|Lecture|Day|Week|Appendix)\.?\s*\d+(?:\.\d+)*\s*[:.\-–—]?\s*/iu,
      ''
    );

    // 4. Bracketed or parenthesized numbering: (1), [1], (1.1), [1.1], (A), [A], (a), [a], (가), [가], (I), [I], (i), [i], (일), (1-1)
    cleaned = cleaned.replace(
      /^[(\[（【]\s*(?:\d+(?:[.-]\d+)*|[A-Za-z]|[ivxlcdmIVXLCDM]{1,6}|[가-하]|[일이삼사오육칠팔구십]|一|二|三|四|五|六|七|八|九|十)\s*[)\]）】]\s*[:.\-–—]?\s*/u,
      ''
    );

    // 5. Hierarchical dotted numbers (e.g. 1.1, 1.2.3, 1.2.3., 1-1, 1-1-1) followed by dot, paren, colon, dash, or space
    cleaned = cleaned.replace(/^\d+(?:[.-]\d+)+(?:\.|\)|\s*[:\-–—]|\s+)\s*/u, '');

    // 6. Single digit numbering (e.g. 1., 1), 1:, 1 -, 1 --)
    //    Requires a following dot, paren, colon, or dash so words like "2024년", "100가지", "3D" are preserved.
    cleaned = cleaned.replace(/^\d+(?:\.|\)|\s*[:\-–—])(?:\s+|$)/u, '');

    // 7. Roman numerals (e.g. I., II., III., IV., i., ii., i), IV:, VII -)
    cleaned = cleaned.replace(
      /^(?:VII|VIII|III|VI|IV|II|IX|XII|XI|XV|XIV|XIII|X|V|I|vii|viii|iii|vi|iv|ii|ix|xii|xi|xv|xiv|xiii|x|v|i)(?:\.|\)|\s*[:\-–—])(?:\s+|$)/u,
      ''
    );

    // 8. Single letter numbering (e.g. A., B., C., a., b., A), b), A -, A:)
    //    Requires single letter + punctuation delimiter + space to avoid stripping words like "AI", "App", "About"
    cleaned = cleaned.replace(/^[A-Za-z](?:\.|\)|\s*[:\-–—])(?:\s+|$)/u, '');

    // 9. Hangul Jamo / Ordinals (e.g. 가., 나., 다., 가), 일., 이., 삼.)
    cleaned = cleaned.replace(/^[가-하](?:\.|\)|\s*[:\-–—])(?:\s+|$)/u, '');
    cleaned = cleaned.replace(/^[일이삼사오육칠팔구십](?:\.|\)|\s*[:\-–—])(?:\s+|$)/u, '');

    // 10. Hanja numbers (e.g. 一., 二., 三.)
    cleaned = cleaned.replace(/^[一二三四五六七八九十](?:\.|\)|\s*[:\-–—])(?:\s+|$)/u, '');

    // 11. Clean leading remaining punctuation artifacts (colons, dashes, etc.)
    cleaned = cleaned.replace(/^[:\-–—]\s*/, '').trim();
  }

  return cleaned || title.trim();
}

/**
 * Helper to convert 1-based index into uppercase alphabetical letter string (1 -> 'A.', 2 -> 'B.', ..., 26 -> 'Z.', 27 -> 'AA.', etc.)
 */
export function toUppercaseAlphaNumbering(n: number): string {
  if (n <= 0) return 'A.';
  let res = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    res = String.fromCharCode(65 + rem) + res;
    num = Math.floor((num - 1) / 26);
  }
  return res + '.';
}

/**
 * Helper to convert 1-based index into parenthesized number string (1 -> '1)', 2 -> '2)', 3 -> '3)', etc.)
 */
export function toParenNumbering(n: number): string {
  if (n <= 0) return '1)';
  return `${n})`;
}

/**
 * Helper to convert 1-based index into lowercase alphabetical letter string (1 -> 'a.', 2 -> 'b.', ..., 26 -> 'z.', 27 -> 'aa.', etc.)
 */
export function toLowercaseAlphaNumbering(n: number): string {
  if (n <= 0) return 'a.';
  let res = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    res = String.fromCharCode(97 + rem) + res;
    num = Math.floor((num - 1) / 26);
  }
  return res + '.';
}

// Backward compatibility alias
export const toAlphaNumbering = toLowercaseAlphaNumbering;

/**
 * Helper to convert 1-based index into lowercase Roman numerals (1 -> 'i.', 2 -> 'ii.', 3 -> 'iii.', 4 -> 'iv.', etc.)
 */
export function toRomanNumbering(n: number): string {
  if (n <= 0) return 'i.';
  const romanMap: [number, string][] = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];

  let res = '';
  let num = n;
  for (const [val, sym] of romanMap) {
    while (num >= val) {
      res += sym;
      num -= val;
    }
  }
  return (res || 'i') + '.';
}

/**
 * Generates hierarchical numbering for TOC headings.
 * - H1, H2: Decimal hierarchy (e.g. 1., 2., 3.)
 * - H3: Uppercase alphabet (A., B., C., ...)
 * - H4: Number with right parenthesis (1), 2), 3), ...)
 * - H5, H6: Lowercase alphabet (a., b., c., ...)
 *
 * Rules:
 * - If there are multiple H1s: H1 is (1., 2.), H2 is (1.1, 1.2), H3 is (A., B.), H4 is (1), 2)), H5 is (a., b.)
 * - If there is only 1 H1 at the top followed by H2s: H1 is Document Title (''), H2 is (1., 2.), H3 is (A., B.), H4 is (1), 2)), H5 is (a., b.)
 * - If there is only 1 H1 and NO H2s/H3s: H1 is (1.).
 * - If there are no H1s (starts with H2, H3, etc.): baseLevel is (1., 2.), H3 is (A., B.), H4 is (1), 2)), H5 is (a., b.)
 */
export function generateTocNumbering(headings: HeadingItem[]): string[] {
  if (!headings || headings.length === 0) return [];

  const h1Count = headings.filter((h) => h.level === 1).length;
  const minLevel = Math.min(...headings.map((h) => h.level));

  // Determine if the first H1 is a single top-level Document Title followed by subheadings
  const hasSubheadingsAfterSingleH1 = h1Count === 1 && headings.some((h) => h.level > 1);
  const isSingleH1Title = h1Count === 1 && headings[0].level === 1 && hasSubheadingsAfterSingleH1;

  const baseLevel = isSingleH1Title ? 2 : minLevel;

  // 1. Build parent-child hierarchy map
  const parentOf: number[] = [];
  const childIndicesOf = new Map<number, number[]>();

  for (let i = 0; i < headings.length; i++) {
    let p = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (headings[j].level < headings[i].level) {
        p = j;
        break;
      }
    }
    parentOf[i] = p;

    if (!childIndicesOf.has(p)) {
      childIndicesOf.set(p, []);
    }
    childIndicesOf.get(p)!.push(i);
  }

  const counters: number[] = [];
  const result: string[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];

    if (isSingleH1Title && heading.level === 1) {
      result.push('');
      counters.length = 0;
      continue;
    }

    const p = parentOf[i];
    const siblings = childIndicesOf.get(p) || [];
    const isSingleChild = siblings.length === 1;

    // Depth starts at 0 for baseLevel
    const depth = Math.max(0, heading.level - baseLevel);

    // Truncate deeper levels
    while (counters.length > depth + 1) {
      counters.pop();
    }

    // Pad missing intermediate levels with 1
    while (counters.length < depth) {
      counters.push(1);
    }

    if (counters.length === depth) {
      counters.push(1);
    } else {
      counters[depth] = (counters[depth] || 0) + 1;
    }

    // Single child / orphan subheadings get bullet '•'
    const isOrphanSubheading = isSingleChild && (p !== -1 || (isSingleH1Title && heading.level > 1) || depth > 0);

    if (isOrphanSubheading) {
      result.push('•');
      continue;
    }

    // Level-specific numbering style based on heading.level:
    // H5, H6: Lowercase letters (a., b., c., ...)
    // H4: Parenthesized numbers (1), 2), 3), ...)
    // H3: Uppercase letters (A., B., C., ...)
    // H1, H2: Decimal numbers (1., 2., 3., or 1.1., 1.2.)
    if (heading.level >= 5) {
      const alphaLower = toLowercaseAlphaNumbering(counters[depth]);
      result.push(alphaLower);
    } else if (heading.level === 4) {
      const parenNum = toParenNumbering(counters[depth]);
      result.push(parenNum);
    } else if (heading.level === 3) {
      const alphaUpper = toUppercaseAlphaNumbering(counters[depth]);
      result.push(alphaUpper);
    } else {
      const numbering = counters.join('.') + '.';
      result.push(numbering);
    }
  }

  return result;
}
