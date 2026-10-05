import React from 'react';

/**
 * Obsidian & Markdown Embeds Preprocessor and Resolver
 */

/**
 * Parses inline CSS style strings (e.g. "color:#1e88e5; font-weight: bold") to React CSSProperties object.
 */
export function parseStyleString(style: any): React.CSSProperties | undefined {
  if (!style) return undefined;
  if (typeof style === 'object') return style;
  if (typeof style !== 'string') return undefined;

  const styleObj: Record<string, string> = {};
  const declarations = style.split(';');
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx > 0) {
      const property = decl.slice(0, colonIdx).trim();
      const value = decl.slice(colonIdx + 1).trim();
      if (property && value) {
        // Convert kebab-case (e.g. background-color, font-size, font-weight) to camelCase
        const camelProp = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        styleObj[camelProp] = value;
      }
    }
  }
  return styleObj as React.CSSProperties;
}

/**
 * Preprocesses Markdown content before feeding into ReactMarkdown:
 * 1. Resolves Obsidian embeds (![[image.png|612]])
 * 2. Resolves Highlight syntax (==highlight== -> <mark>highlight</mark>) outside code blocks
 * 3. Preserves tildes (~single tilde~) outside code blocks
 * 4. Preserves extra empty lines (3+ newlines)
 */
export function preprocessMarkdown(markdown: string): string {
  if (!markdown) return '';

  // 1. Transform Obsidian embeds
  const withEmbeds = transformObsidianEmbeds(markdown);

  // 2. Split by code blocks, inline code, and Base64 image tags / data URLs to protect them from regex alteration
  const parts = withEmbeds.split(
    /(```[\s\S]*?```|`[^`\n]+`|!\[[\s\S]*?\]\(data:image\/[^)]+\)|<img[\s\S]*?src=["']data:image\/[^"']+["'][\s\S]*?>|data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+)/g
  );

  return parts
    .map((part, index) => {
      // Odd indices are code blocks, inline code, or data URLs - leave them intact
      if (index % 2 === 1) {
        return part;
      }

      // Even indices are regular markdown
      return part
        .replace(/(^|[^\~])\~([^\~\n]+)\~([^\~]|$)/g, '$1&#126;$2&#126;$3')
        .replace(/==(?!=)([^\n]+?)(?<!=)==/g, '<mark>$1</mark>')
        .replace(/\n{3,}/g, (match) => {
          const count = match.length - 2;
          if (count === 1) {
            return '\n<div class="h-4 my-1"></div>\n\n';
          }
          return '\n' + '<div class="h-4 my-1"></div>\n'.repeat(count - 1) + '<div class="h-4 my-1"></div>\n\n';
        });
    })
    .join('');
}


/**
 * Transforms Obsidian Wikilink Embed syntax:
 * - ![[image.png]]
 * - ![[image.png|612]] (width 612px)
 * - ![[image.png|612x400]] (width 612px, height 400px)
 * - ![[image.png|Caption Text]]
 * - ![[folder/image.png|300]]
 * - ![[audio.mp3]]
 * - ![[video.mp4]]
 * - ![[document.pdf]]
 */
export function transformObsidianEmbeds(markdown: string): string {
  if (!markdown) return '';

  return markdown.replace(
    /!\[\[\s*([^\]|\n]+?)(?:\|([^\]\n]+))?\s*\]\]/g,
    (match, target, param) => {
      const cleanTarget = target.trim();
      const cleanParam = param ? param.trim() : '';

      // 1. Image Embeds (.png, .jpg, .jpeg, .gif, .webp, .svg, .bmp, .ico, .avif, .tiff)
      const isImage = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff)$/i.test(cleanTarget);
      if (isImage) {
        let widthAttr = '';
        let heightAttr = '';
        let altText = cleanParam || cleanTarget;

        if (cleanParam) {
          const sizeMatch = cleanParam.match(/^(\d+)(?:x(\d+))?$/i);
          if (sizeMatch) {
            const w = sizeMatch[1];
            const h = sizeMatch[2];
            widthAttr = `width="${w}"`;
            if (h) {
              heightAttr = `height="${h}"`;
            }
            altText = cleanTarget;
          }
        }

        return `<img src="${cleanTarget}" alt="${altText}" ${widthAttr} ${heightAttr} data-obsidian-embed="true" />`;
      }

      // 2. Audio Embeds (.mp3, .wav, .ogg, .m4a, .aac)
      if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(cleanTarget)) {
        return `<audio controls src="${cleanTarget}" class="my-3 w-full max-w-md block"></audio>`;
      }

      // 3. Video Embeds (.mp4, .webm, .mov, .mkv)
      if (/\.(mp4|webm|mov|mkv)$/i.test(cleanTarget)) {
        return `<video controls src="${cleanTarget}" class="my-3 max-w-full rounded-lg shadow-sm block"></video>`;
      }

      // 4. PDF Embeds
      if (/\.pdf$/i.test(cleanTarget)) {
        return `<iframe src="${cleanTarget}" class="w-full h-96 my-3 rounded-lg border border-gray-300 dark:border-gray-700"></iframe>`;
      }

      return match;
    }
  );
}

/**
 * Normalizes a disk path according to OS / path style:
 * - If Windows path (starts with drive letter like D: or contains \), unifies all separators to \ and removes redundant slashes
 * - If POSIX path (starts with /), unifies all separators to /
 */
export function normalizeDiskPath(rawPath: string, baseFilePath?: string): string {
  if (!rawPath) return '';
  if (
    rawPath.startsWith('http://') ||
    rawPath.startsWith('https://') ||
    rawPath.startsWith('data:') ||
    rawPath.startsWith('blob:')
  ) {
    return rawPath;
  }

  const isWindows =
    /^[a-zA-Z]:/i.test(rawPath) ||
    rawPath.includes('\\') ||
    (baseFilePath && (/^[a-zA-Z]:/i.test(baseFilePath) || baseFilePath.includes('\\')));

  if (isWindows) {
    // Replace all forward slashes with backslashes
    let normalized = rawPath.replace(/\//g, '\\');
    // Normalize consecutive backslashes except for leading UNC path prefix (\\server\...)
    const isUnc = normalized.startsWith('\\\\');
    normalized = normalized.replace(/\\{2,}/g, '\\');
    if (isUnc && !normalized.startsWith('\\\\')) {
      normalized = '\\' + normalized;
    }
    return normalized;
  } else {
    // Unix-style path
    return rawPath.replace(/\\/g, '/').replace(/\/+/g, '/');
  }
}

/**
 * Returns candidate absolute or relative paths for an image based on base markdown file path.
 */
export function getImageCandidatePaths(rawSrc: string, baseFilePath?: string): string[] {
  if (!rawSrc) return [];

  let decodedSrc = rawSrc;
  try {
    decodedSrc = decodeURIComponent(rawSrc);
  } catch {
    // fallback if malformed
  }

  // If already web URL, data URL, blob, or asset URL
  if (
    decodedSrc.startsWith('http://') ||
    decodedSrc.startsWith('https://') ||
    decodedSrc.startsWith('data:') ||
    decodedSrc.startsWith('blob:') ||
    decodedSrc.startsWith('asset://')
  ) {
    return [decodedSrc];
  }

  // If already an absolute file path (e.g. C:\... or /...)
  if (/^[a-zA-Z]:[/\\]/.test(decodedSrc) || decodedSrc.startsWith('/')) {
    return [normalizeDiskPath(decodedSrc, baseFilePath)];
  }

  const candidates: string[] = [];
  const commonSubdirs = [
    '',
    'attachments',
    'attachment',
    '_attachments',
    'assets',
    'asset',
    '_assets',
    'images',
    'image',
    'img',
    'files',
    'file',
    '_resources',
    'resources',
    'media',
    'pasted_images',
    'pasted',
    '99_Attachments',
    '99-Attachments',
    'static',
    'public',
  ];

  if (baseFilePath) {
    const isWindows = baseFilePath.includes('\\') || /^[a-zA-Z]:/.test(baseFilePath);
    const sep = isWindows ? '\\' : '/';
    const lastSep = Math.max(baseFilePath.lastIndexOf('/'), baseFilePath.lastIndexOf('\\'));
    let currentDir = lastSep !== -1 ? baseFilePath.substring(0, lastSep) : '';

    // Search note dir and up to 5 levels of ancestor directories (to cover Obsidian Vault root)
    for (let depth = 0; depth < 6 && currentDir; depth++) {
      for (const subdir of commonSubdirs) {
        const fullCandidate = subdir
          ? `${currentDir}${sep}${subdir}${sep}${decodedSrc}`
          : `${currentDir}${sep}${decodedSrc}`;
        const normalized = normalizeDiskPath(fullCandidate, baseFilePath);
        if (!candidates.includes(normalized)) {
          candidates.push(normalized);
        }
      }

      const parentSep = Math.max(currentDir.lastIndexOf('/'), currentDir.lastIndexOf('\\'));
      if (parentSep !== -1 && parentSep > (isWindows && currentDir.indexOf(':') === 1 ? 2 : 0)) {
        currentDir = currentDir.substring(0, parentSep);
      } else {
        break;
      }
    }
  }

  // Fallback to raw decoded src
  const normalizedRaw = normalizeDiskPath(decodedSrc, baseFilePath);
  if (!candidates.includes(normalizedRaw)) {
    candidates.push(normalizedRaw);
  }

  return candidates;
}

/**
 * Extracts the real filesystem path from Tauri asset protocol URLs (asset://, asset.localhost).
 */
export function extractFilePathFromAssetUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/^(?:https?:\/\/asset\.localhost\/|asset:\/\/localhost\/|asset:\/\/)(.+)$/i);
  if (match) {
    try {
      let decoded = decodeURIComponent(match[1]);
      // Remove leading slashes before drive letter e.g. "/D:/..." -> "D:/..."
      decoded = decoded.replace(/^\/+([a-zA-Z]:)/, '$1');
      return normalizeDiskPath(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Replaces referenced image tags (Obsidian ![[...]], Standard ![...](...), and HTML <img src="...">)
 * matching rawSrc with Base64 dataUrl in the markdown string.
 */
export function embedImageDataUrlInMarkdown(
  markdown: string,
  rawSrc: string,
  dataUrl: string
): string {
  if (!markdown || !rawSrc || !dataUrl) return markdown;

  const cleanRawSrc = rawSrc.trim().replace(/^<|>$/g, '');
  let decodedRawSrc = cleanRawSrc;
  try {
    decodedRawSrc = decodeURIComponent(cleanRawSrc);
  } catch {}

  const getBaseName = (s: string) => {
    const noQuery = s.split(/[?#]/)[0];
    return (noQuery.split(/[/\\]/).pop() || noQuery).trim().toLowerCase();
  };

  const rawFilename = getBaseName(cleanRawSrc);
  const decodedFilename = getBaseName(decodedRawSrc);
  const lowerCleanRawSrc = cleanRawSrc.toLowerCase();
  const lowerDecodedRawSrc = decodedRawSrc.toLowerCase();

  const isMatch = (target: string): boolean => {
    if (!target) return false;
    let cleanTarget = target.trim().replace(/^<|>$/g, '');
    // Strip trailing markdown title if present e.g. 'path.png "title"' -> 'path.png'
    cleanTarget = cleanTarget.replace(/\s+["'].*?["']$/, '').trim();

    let decodedTarget = cleanTarget;
    try {
      decodedTarget = decodeURIComponent(cleanTarget);
    } catch {}

    const targetFilename = getBaseName(cleanTarget);
    const decodedTargetFilename = getBaseName(decodedTarget);
    const lowerCleanTarget = cleanTarget.toLowerCase();
    const lowerDecodedTarget = decodedTarget.toLowerCase();

    return (
      lowerCleanTarget === lowerCleanRawSrc ||
      lowerDecodedTarget === lowerDecodedRawSrc ||
      lowerCleanTarget === lowerDecodedRawSrc ||
      lowerDecodedTarget === lowerCleanRawSrc ||
      targetFilename === rawFilename ||
      decodedTargetFilename === decodedFilename ||
      targetFilename === decodedFilename ||
      decodedTargetFilename === rawFilename ||
      (rawFilename.length > 3 && (targetFilename.includes(rawFilename) || rawFilename.includes(targetFilename))) ||
      (decodedFilename.length > 3 && (decodedTargetFilename.includes(decodedFilename) || decodedFilename.includes(decodedTargetFilename)))
    );
  };

  // 1. Replace Obsidian Wikilink Embeds: ![[image.png]] or ![[image.png|600]]
  let result = markdown.replace(
    /!\[\[\s*([^\]|\n]+?)(?:\|([^\]\n]+))?\s*\]\]/g,
    (match, target, param) => {
      if (isMatch(target)) {
        const altText = param ? `${target.trim()}|${param.trim()}` : target.trim();
        return `![${altText}](${dataUrl})`;
      }
      return match;
    }
  );

  // 2. Replace Standard Markdown Image Embeds: ![alt](path/to/image.png "title") or ![alt](<path with space.png>)
  result = result.replace(
    /!\[(.*?)\]\(\s*(?:<([^>]+)>|([^)\n]+))\s*\)/g,
    (match, alt, angleUrl, normalUrl) => {
      const targetUrl = (angleUrl || normalUrl || '').trim();
      if (isMatch(targetUrl)) {
        return `![${alt}](${dataUrl})`;
      }
      return match;
    }
  );

  // 3. Replace HTML <img src="..." /> tags
  result = result.replace(
    /<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)\/?>/gi,
    (match, before, srcVal, after) => {
      if (isMatch(srcVal)) {
        const cleanBefore = before && before.trim() ? `${before.trim()} ` : '';
        const cleanAfter = after && after.trim() ? ` ${after.trim()}` : '';
        return `<img ${cleanBefore}src="${dataUrl}"${cleanAfter} />`;
      }
      return match;
    }
  );

  return result;
}

