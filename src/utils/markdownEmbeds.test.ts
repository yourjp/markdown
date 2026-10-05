import { describe, expect, it } from 'vitest';
import {
  getImageCandidatePaths,
  parseStyleString,
  preprocessMarkdown,
  transformObsidianEmbeds,
  embedImageDataUrlInMarkdown,
  extractFilePathFromAssetUrl,
  normalizeDiskPath,
} from './markdownEmbeds';

describe('markdown embed utilities', () => {
  describe('parseStyleString', () => {
    it('converts inline CSS declarations to React style properties', () => {
      expect(parseStyleString('color: #1e88e5; font-weight: bold; background-color: white')).toEqual({
        color: '#1e88e5',
        fontWeight: 'bold',
        backgroundColor: 'white',
      });
    });

    it('returns existing style objects unchanged', () => {
      const style = { color: 'red' };

      expect(parseStyleString(style)).toBe(style);
    });
  });

  describe('transformObsidianEmbeds', () => {
    it('transforms image embeds with width and height parameters', () => {
      expect(transformObsidianEmbeds('![[folder/image.png|612x400]]')).toBe(
        '<img src="folder/image.png" alt="folder/image.png" width="612" height="400" data-obsidian-embed="true" />',
      );
    });

    it('uses non-size image parameters as alt text', () => {
      expect(transformObsidianEmbeds('![[diagram.svg|Architecture Diagram]]')).toBe(
        '<img src="diagram.svg" alt="Architecture Diagram"   data-obsidian-embed="true" />',
      );
    });

    it('transforms audio, video, and PDF embeds to matching HTML elements', () => {
      const markdown = ['![[voice.mp3]]', '![[clip.mp4]]', '![[paper.pdf]]'].join('\n');
      const transformed = transformObsidianEmbeds(markdown);

      expect(transformed).toContain('<audio controls src="voice.mp3"');
      expect(transformed).toContain('<video controls src="clip.mp4"');
      expect(transformed).toContain('<iframe src="paper.pdf"');
    });

    it('leaves unknown embed targets untouched', () => {
      expect(transformObsidianEmbeds('![[Related Note]]')).toBe('![[Related Note]]');
    });
  });

  describe('preprocessMarkdown', () => {
    it('highlights Obsidian highlight syntax outside code spans and code blocks', () => {
      const markdown = ['==visible==', '`==inline code==`', '```', '==code block==', '```'].join('\n');

      expect(preprocessMarkdown(markdown)).toBe(
        ['<mark>visible</mark>', '`==inline code==`', '```', '==code block==', '```'].join('\n'),
      );
    });

    it('preserves single tildes outside code as literal entities', () => {
      expect(preprocessMarkdown('Keep ~literal~ tildes and `~code~`.')).toBe(
        'Keep &#126;literal&#126; tildes and `~code~`.',
      );
    });

    it('inserts spacer divs for extra blank lines while preserving exact line count', () => {
      expect(preprocessMarkdown('a\n\n\nb')).toBe('a\n<div class="h-4 my-1"></div>\n\nb');
      expect(preprocessMarkdown('a\n\n\nb').split('\n').length).toBe('a\n\n\nb'.split('\n').length);
    });

    it('protects base64 data URLs with padding == from being altered by highlight syntax', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const md = `==Highlight 1==\n\n![My Image](${dataUrl})\n\n==Highlight 2==`;
      const processed = preprocessMarkdown(md);

      expect(processed).toContain(`![My Image](${dataUrl})`);
      expect(processed).toContain('<mark>Highlight 1</mark>');
      expect(processed).toContain('<mark>Highlight 2</mark>');
    });
  });

  describe('getImageCandidatePaths', () => {
    it('returns web and absolute paths as-is', () => {
      expect(getImageCandidatePaths('https://example.com/image.png')).toEqual([
        'https://example.com/image.png',
      ]);
      expect(getImageCandidatePaths('D:\\Vault\\image.png')).toEqual(['D:\\Vault\\image.png']);
    });

    it('decodes relative paths and searches note ancestors plus common asset folders', () => {
      const candidates = getImageCandidatePaths('My%20Image.png', 'D:\\Vault\\Trips\\Japan\\note.md');

      expect(candidates[0]).toBe('D:\\Vault\\Trips\\Japan\\My Image.png');
      expect(candidates).toContain('D:\\Vault\\Trips\\Japan\\attachments\\My Image.png');
      expect(candidates).toContain('D:\\Vault\\Trips\\attachments\\My Image.png');
      expect(candidates[candidates.length - 1]).toBe('My Image.png');
    });

    it('falls back to raw input when URI decoding fails', () => {
      expect(getImageCandidatePaths('%E0%A4%A')).toEqual(['%E0%A4%A']);
    });
  });

  describe('embedImageDataUrlInMarkdown', () => {
    const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA';

    it('replaces Obsidian wikilink embed with Data URL', () => {
      const md = '# Note\n\n![[screenshot.png]]\n\nSome text.';
      const embedded = embedImageDataUrlInMarkdown(md, 'screenshot.png', sampleDataUrl);
      expect(embedded).toBe(`# Note\n\n![screenshot.png](${sampleDataUrl})\n\nSome text.`);
    });

    it('replaces Obsidian wikilink embed with size or caption parameter', () => {
      const md = '![[folder/pic.jpg|600x400]]';
      const embedded = embedImageDataUrlInMarkdown(md, 'pic.jpg', sampleDataUrl);
      expect(embedded).toBe(`![folder/pic.jpg|600x400](${sampleDataUrl})`);
    });

    it('replaces standard markdown image syntax with Data URL', () => {
      const md = '![My Alt Text](assets/diagram.png)';
      const embedded = embedImageDataUrlInMarkdown(md, 'assets/diagram.png', sampleDataUrl);
      expect(embedded).toBe(`![My Alt Text](${sampleDataUrl})`);
    });

    it('replaces standard markdown image syntax with title', () => {
      const md = '![My Alt](assets/diagram.png "Diagram Title")';
      const embedded = embedImageDataUrlInMarkdown(md, 'diagram.png', sampleDataUrl);
      expect(embedded).toBe(`![My Alt](${sampleDataUrl})`);
    });

    it('replaces HTML img tags with Data URL', () => {
      const md = '<img src="images/banner.png" alt="Banner" width="500" />';
      const embedded = embedImageDataUrlInMarkdown(md, 'banner.png', sampleDataUrl);
      expect(embedded).toBe(`<img src="${sampleDataUrl}" alt="Banner" width="500" />`);
    });
  });

  describe('normalizeDiskPath', () => {
    it('normalizes windows paths with mixed slashes to clean backslashes', () => {
      expect(normalizeDiskPath('D:\\옵시디언\\image/Pasted image 20260824200601.png')).toBe(
        'D:\\옵시디언\\image\\Pasted image 20260824200601.png'
      );
      expect(normalizeDiskPath('C:/Users/photo/image.png')).toBe(
        'C:\\Users\\photo\\image.png'
      );
    });

    it('preserves web urls and data urls', () => {
      expect(normalizeDiskPath('https://example.com/image.png')).toBe('https://example.com/image.png');
      expect(normalizeDiskPath('data:image/png;base64,123')).toBe('data:image/png;base64,123');
    });
  });

  describe('extractFilePathFromAssetUrl', () => {
    it('extracts windows path from asset.localhost url', () => {
      expect(extractFilePathFromAssetUrl('http://asset.localhost/D%3A%2FVault%2Fimage.png')).toBe('D:\\Vault\\image.png');
      expect(extractFilePathFromAssetUrl('https://asset.localhost/C%3A%2FUsers%2Fphoto.jpg')).toBe('C:\\Users\\photo.jpg');
    });

    it('extracts path from asset:// protocol url', () => {
      expect(extractFilePathFromAssetUrl('asset://localhost/D%3A%2Fnotes%2Fpic.png')).toBe('D:\\notes\\pic.png');
    });

    it('returns null for non-asset urls', () => {
      expect(extractFilePathFromAssetUrl('https://example.com/image.png')).toBeNull();
      expect(extractFilePathFromAssetUrl('data:image/png;base64,123')).toBeNull();
      expect(extractFilePathFromAssetUrl('')).toBeNull();
    });
  });
});
