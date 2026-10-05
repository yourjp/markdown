import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getImageCandidatePaths, extractFilePathFromAssetUrl, normalizeDiskPath } from '../utils/markdownEmbeds';
import { ImageOff, ZoomIn, ZoomOut, X, Maximize2, RotateCcw, FolderOpen, FileCode, Check, Copy } from 'lucide-react';

interface MarkdownImageProps {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  baseFilePath?: string;
  onEmbedImage?: (rawSrc: string, dataUrl: string, sourcePath?: string) => void;
  [key: string]: any;
}

// In-memory cache for fast display of loaded base64 Data URLs
const imageDataCache = new Map<string, string>();
// In-memory cache for resolved disk paths
const resolvedDiskPathCache = new Map<string, string>();

const saveResolvedDiskPath = (rawSrc: string, baseFilePath: string | undefined, diskPath: string) => {
  if (!rawSrc || !diskPath) return;
  const normalizedPath = normalizeDiskPath(diskPath, baseFilePath);
  const currentKey = `${rawSrc}@@${baseFilePath || ''}`;
  resolvedDiskPathCache.set(currentKey, normalizedPath);
  resolvedDiskPathCache.set(rawSrc, normalizedPath);

  try {
    const overrides = JSON.parse(localStorage.getItem('markdown_image_overrides') || '{}');
    overrides[rawSrc] = normalizedPath;
    overrides[currentKey] = normalizedPath;
    localStorage.setItem('markdown_image_overrides', JSON.stringify(overrides));
  } catch {}

  try {
    const dir = normalizedPath.replace(/[/\\][^/\\]+$/, '');
    if (dir) {
      localStorage.setItem('last_image_folder', dir);
    }
  } catch {}
};

const getSavedResolvedDiskPath = (rawSrc: string, baseFilePath?: string): string | null => {
  if (!rawSrc) return null;
  const currentKey = `${rawSrc}@@${baseFilePath || ''}`;
  if (resolvedDiskPathCache.has(currentKey)) return normalizeDiskPath(resolvedDiskPathCache.get(currentKey)!, baseFilePath);
  if (resolvedDiskPathCache.has(rawSrc)) return normalizeDiskPath(resolvedDiskPathCache.get(rawSrc)!, baseFilePath);

  try {
    const overrides = JSON.parse(localStorage.getItem('markdown_image_overrides') || '{}');
    if (overrides[currentKey]) return normalizeDiskPath(overrides[currentKey], baseFilePath);
    if (overrides[rawSrc]) return normalizeDiskPath(overrides[rawSrc], baseFilePath);
    const decoded = decodeURIComponent(rawSrc);
    if (overrides[decoded]) return normalizeDiskPath(overrides[decoded], baseFilePath);
    const slashNormalized = rawSrc.replace(/\\/g, '/');
    if (overrides[slashNormalized]) return normalizeDiskPath(overrides[slashNormalized], baseFilePath);
  } catch {}

  return null;
};

const getHintFolders = (): string[] => {
  const folders: string[] = [];
  try {
    const lastFolder = localStorage.getItem('last_image_folder');
    if (lastFolder && !folders.includes(lastFolder)) folders.push(lastFolder);

    const overrides = JSON.parse(localStorage.getItem('markdown_image_overrides') || '{}');
    if (overrides && typeof overrides === 'object') {
      for (const key of Object.keys(overrides)) {
        const val = overrides[key];
        if (val && typeof val === 'string') {
          const dir = val.replace(/[/\\][^/\\]+$/, '');
          if (dir && !folders.includes(dir)) folders.push(dir);
        }
      }
    }

    const recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    if (Array.isArray(recentFiles)) {
      for (const f of recentFiles) {
        if (f.filePath) {
          const dir = f.filePath.replace(/[/\\][^/\\]+$/, '');
          if (dir && !folders.includes(dir)) folders.push(dir);
        }
      }
    }

    const openTabs = JSON.parse(localStorage.getItem('openTabs') || '[]');
    if (Array.isArray(openTabs)) {
      for (const t of openTabs) {
        if (t.filePath) {
          const dir = t.filePath.replace(/[/\\][^/\\]+$/, '');
          if (dir && !folders.includes(dir)) folders.push(dir);
        }
      }
    }
  } catch {}
  return folders;
};

const MarkdownImageComponent: React.FC<MarkdownImageProps> = ({
  src = '',
  alt = '',
  width: propWidth,
  height: propHeight,
  style,
  baseFilePath,
  onEmbedImage,
  ...props
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);
  const prevKeyRef = useRef<string>('');
  const resolvedDiskPathRef = useRef<string | null>(getSavedResolvedDiskPath(src, baseFilePath));

  // 1. Parse Dimensions from alt if formatted like "image.png|612" or "caption|612x400"
  const { parsedWidth, parsedHeight, displayAlt } = useMemo(() => {
    let w: string | number | undefined = propWidth;
    let h: string | number | undefined = propHeight;
    let cleanAlt = alt || '';

    if (!w && alt && alt.includes('|')) {
      const parts = alt.split('|');
      const lastPart = parts[parts.length - 1].trim();
      const sizeMatch = lastPart.match(/^(\d+)(?:x(\d+))?$/i);
      if (sizeMatch) {
        w = parseInt(sizeMatch[1], 10);
        if (sizeMatch[2]) {
          h = parseInt(sizeMatch[2], 10);
        }
        cleanAlt = parts.slice(0, -1).join('|').trim() || '';
      }
    }

    return { parsedWidth: w, parsedHeight: h, displayAlt: cleanAlt };
  }, [alt, propWidth, propHeight]);

  // 2. Candidate paths
  const candidatePaths = useMemo(() => {
    return getImageCandidatePaths(src, baseFilePath);
  }, [src, baseFilePath]);

  const [resolvedDiskPath, setResolvedDiskPath] = useState<string | null>(() => {
    const saved = getSavedResolvedDiskPath(src, baseFilePath);
    if (saved) return normalizeDiskPath(saved, baseFilePath);
    if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('blob:')) {
      if (/^([a-zA-Z]:[\\/]|\\\\|\/)/.test(src)) {
        return normalizeDiskPath(src, baseFilePath);
      }
    }
    return null;
  });
  const [pathCopied, setPathCopied] = useState<boolean>(false);

  const [displayUrl, setDisplayUrl] = useState<string>(() => {
    if (!src) return '';
    if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('data:') ||
      src.startsWith('blob:')
    ) {
      return src;
    }
    const currentKey = `${src}@@${baseFilePath || ''}`;
    if (imageDataCache.has(currentKey)) return imageDataCache.get(currentKey)!;
    if (imageDataCache.has(src)) return imageDataCache.get(src)!;
    return '';
  });
  const [loadFailed, setLoadFailed] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    return Boolean(displayUrl);
  });
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);

  const prevSrcRef = useRef<string>(src);

  // 3. Resolve Native Image Path & Load as Data URL
  useEffect(() => {
    let isMounted = true;
    const currentKey = `${src}@@${baseFilePath || ''}`;

    if (!src) {
      setDisplayUrl('');
      setResolvedDiskPath(null);
      setLoadFailed(false);
      setIsLoaded(false);
      prevSrcRef.current = src;
      return;
    }

    // 3A. If src itself is a direct Data URL, Web URL, or Blob URL
    if (
      src.startsWith('data:') ||
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('blob:')
    ) {
      setDisplayUrl(src);
      setLoadFailed(false);
      setIsLoaded(true);
      imageDataCache.set(currentKey, src);
      imageDataCache.set(src, src);
      prevSrcRef.current = src;
      return;
    }

    const savedDiskPath = getSavedResolvedDiskPath(src, baseFilePath) || (
      !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('blob:') && /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(src) ? normalizeDiskPath(src, baseFilePath) : null
    );
    if (savedDiskPath) {
      setResolvedDiskPath(savedDiskPath);
    }

    // 3B. If src changed, reset loadFailed and retrieve from cache if available
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      setLoadFailed(false);
      if (imageDataCache.has(currentKey) || imageDataCache.has(src)) {
        const cached = imageDataCache.get(currentKey) || imageDataCache.get(src)!;
        setDisplayUrl(cached);
        setIsLoaded(true);
        return;
      }
    } else {
      // If src is identical and we already have a valid displayUrl, keep it
      if (displayUrl && (displayUrl.startsWith('data:') || displayUrl.startsWith('http') || displayUrl.startsWith('asset:'))) {
        return;
      }
    }

    if (imageDataCache.has(currentKey) || imageDataCache.has(src)) {
      const cached = imageDataCache.get(currentKey) || imageDataCache.get(src)!;
      setDisplayUrl(cached);
      setLoadFailed(false);
      setIsLoaded(true);
      return;
    }

    const resolveAndLoad = async () => {
      // 3B. Check saved/override path
      let targetPath: string | null = getSavedResolvedDiskPath(src, baseFilePath);

      // 3C. Try resolving via Tauri backend
      if (!targetPath && typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const found = await invoke<string | null>('resolve_image_path', {
            baseFilePath: baseFilePath || undefined,
            imageSrc: src,
            hintFolders: getHintFolders(),
          });
          if (found) {
            const normalized = normalizeDiskPath(found, baseFilePath);
            targetPath = normalized;
            resolvedDiskPathRef.current = normalized;
            if (isMounted) setResolvedDiskPath(normalized);
            saveResolvedDiskPath(src, baseFilePath, normalized);
          }
        } catch (err) {
          console.warn('resolve_image_path error:', err);
        }
      }

      // If we found a target path on disk
      if (targetPath) {
        const normalizedTarget = normalizeDiskPath(targetPath, baseFilePath);
        resolvedDiskPathRef.current = normalizedTarget;
        if (isMounted) setResolvedDiskPath(normalizedTarget);
        saveResolvedDiskPath(src, baseFilePath, normalizedTarget);

        // Check in-memory cache first
        if (imageDataCache.has(normalizedTarget)) {
          if (isMounted) {
            const cached = imageDataCache.get(normalizedTarget)!;
            imageDataCache.set(currentKey, cached);
            imageDataCache.set(src, cached);
            setDisplayUrl(cached);
            setLoadFailed(false);
            setIsLoaded(true);
          }
          return;
        }

        // Try reading via Rust read_image_data_url (Bypasses WebView2 asset security blocks)
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          try {
            const dataUrl = await invoke<string>('read_image_data_url', { path: normalizedTarget });
            if (isMounted && dataUrl) {
              imageDataCache.set(normalizedTarget, dataUrl);
              imageDataCache.set(currentKey, dataUrl);
              imageDataCache.set(src, dataUrl);
              setDisplayUrl(dataUrl);
              setLoadFailed(false);
              setIsLoaded(true);
              return;
            }
          } catch (err) {
            console.warn('read_image_data_url failed:', err);
          }
        }

        // Fallback to convertFileSrc
        try {
          if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            const assetUrl = convertFileSrc(normalizedTarget);
            if (isMounted) {
              imageDataCache.set(normalizedTarget, assetUrl);
              imageDataCache.set(currentKey, assetUrl);
              imageDataCache.set(src, assetUrl);
              setDisplayUrl(assetUrl);
              return;
            }
          }
        } catch {}
      }

      // 3D. Try candidate paths sequentially via read_image_data_url
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        for (const candidate of candidatePaths) {
          if (candidate.startsWith('http://') || candidate.startsWith('https://')) continue;
          try {
            const normalizedCandidate = normalizeDiskPath(candidate, baseFilePath);
            const dataUrl = await invoke<string>('read_image_data_url', { path: normalizedCandidate });
            if (isMounted && dataUrl) {
              resolvedDiskPathRef.current = normalizedCandidate;
              setResolvedDiskPath(normalizedCandidate);
              saveResolvedDiskPath(src, baseFilePath, normalizedCandidate);
              imageDataCache.set(normalizedCandidate, dataUrl);
              imageDataCache.set(currentKey, dataUrl);
              imageDataCache.set(src, dataUrl);
              setDisplayUrl(dataUrl);
              setLoadFailed(false);
              setIsLoaded(true);
              return;
            }
          } catch {}
        }
      }

      // 3E. Fallback to first candidate URL
      if (candidatePaths.length > 0) {
        const first = candidatePaths[0];
        if (!first.startsWith('http://') && !first.startsWith('https://')) {
          if (isMounted) setResolvedDiskPath(first);
        }
        try {
          if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            const fallback = convertFileSrc(first);
            if (isMounted) setDisplayUrl(fallback);
          } else {
            if (isMounted) setDisplayUrl(first);
          }
        } catch {
          if (isMounted) setDisplayUrl(first);
        }
      } else {
        if (isMounted) setLoadFailed(true);
      }
    };

    resolveAndLoad();

    return () => {
      isMounted = false;
    };
  }, [src, baseFilePath]);

  // Handle manual file selection by user
  const handleManualPickImage = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // 1. Try Tauri native file picker
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const selected = await invoke<string | null>('pick_image_dialog');
        if (selected) {
          const normalizedSelected = normalizeDiskPath(selected, baseFilePath);
          resolvedDiskPathRef.current = normalizedSelected;
          setResolvedDiskPath(normalizedSelected);
          saveResolvedDiskPath(src, baseFilePath, normalizedSelected);

          // Immediately read data url for selected file
          try {
            const dataUrl = await invoke<string>('read_image_data_url', { path: normalizedSelected });
            if (dataUrl) {
              imageDataCache.set(normalizedSelected, dataUrl);
              setDisplayUrl(dataUrl);
              setLoadFailed(false);
              setIsLoaded(true);

              // Permanently embed in Markdown document text
              onEmbedImage?.(src, dataUrl, normalizedSelected);
              return;
            }
          } catch (err) {
            console.warn('read_image_data_url failed on pick:', err);
          }

          // Fallback to convertFileSrc
          const fallback = convertFileSrc(normalizedSelected);
          setDisplayUrl(fallback);
          setLoadFailed(false);
          setIsLoaded(true);
          return;
        } else if (selected === null) {
          return; // User cancelled
        }
      }
    } catch (err) {
      console.warn('pick_image_dialog failed, falling back to input:', err);
    }

    // 2. Web input fallback
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setDisplayUrl(dataUrl);
          setLoadFailed(false);
          setIsLoaded(true);
          onEmbedImage?.(src, dataUrl, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Embed currently loaded image to markdown document using stored/resolved disk path
  const handleEmbedCurrentToMarkdown = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const currentKey = `${src}@@${baseFilePath || ''}`;

    // 1. If displayUrl is already a Base64 data URL
    if (displayUrl && displayUrl.startsWith('data:')) {
      imageDataCache.set(currentKey, displayUrl);
      imageDataCache.set(src, displayUrl);
      onEmbedImage?.(src, displayUrl, resolvedDiskPath || src);
      return;
    }

    // 2. Use stored/resolved disk path (saved during automatic loading or manual pick)
    const storedPath = resolvedDiskPathRef.current || getSavedResolvedDiskPath(src, baseFilePath) || extractFilePathFromAssetUrl(displayUrl);
    if (storedPath && typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const normalizedStored = normalizeDiskPath(storedPath, baseFilePath);
        const dataUrl = await invoke<string>('read_image_data_url', { path: normalizedStored });
        if (dataUrl) {
          imageDataCache.set(normalizedStored, dataUrl);
          imageDataCache.set(currentKey, dataUrl);
          imageDataCache.set(src, dataUrl);
          setDisplayUrl(dataUrl);
          setIsLoaded(true);
          onEmbedImage?.(src, dataUrl, normalizedStored);
          return;
        }
      } catch (err) {
        console.warn('read_image_data_url on storedPath failed:', err);
      }
    }

    // 3. Try resolving via Tauri backend if not stored yet
    let targetPath: string | null = null;
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const found = await invoke<string | null>('resolve_image_path', {
          baseFilePath: baseFilePath || undefined,
          imageSrc: src,
          hintFolders: getHintFolders(),
        });
        if (found) {
          const normalizedFound = normalizeDiskPath(found, baseFilePath);
          targetPath = normalizedFound;
          resolvedDiskPathRef.current = normalizedFound;
          setResolvedDiskPath(normalizedFound);
          saveResolvedDiskPath(src, baseFilePath, normalizedFound);
        }
      } catch {}
    }

    if (targetPath && typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const dataUrl = await invoke<string>('read_image_data_url', { path: targetPath });
        if (dataUrl) {
          imageDataCache.set(targetPath, dataUrl);
          imageDataCache.set(currentKey, dataUrl);
          imageDataCache.set(src, dataUrl);
          setDisplayUrl(dataUrl);
          setIsLoaded(true);
          onEmbedImage?.(src, dataUrl, targetPath);
          return;
        }
      } catch {}
    }

    // 4. Try reading from candidate paths
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      for (const candidate of candidatePaths) {
        if (candidate.startsWith('http://') || candidate.startsWith('https://')) continue;
        try {
          const normalizedCandidate = normalizeDiskPath(candidate, baseFilePath);
          const dataUrl = await invoke<string>('read_image_data_url', { path: normalizedCandidate });
          if (dataUrl) {
            resolvedDiskPathRef.current = normalizedCandidate;
            setResolvedDiskPath(normalizedCandidate);
            saveResolvedDiskPath(src, baseFilePath, normalizedCandidate);
            imageDataCache.set(normalizedCandidate, dataUrl);
            imageDataCache.set(currentKey, dataUrl);
            imageDataCache.set(src, dataUrl);
            setDisplayUrl(dataUrl);
            setIsLoaded(true);
            onEmbedImage?.(src, dataUrl, normalizedCandidate);
            return;
          }
        } catch {}
      }
    }

    // 5. Canvas Export from rendered <img> element in DOM (Guarantees 100% success for any displayed image)
    if (imgElementRef.current && isLoaded) {
      try {
        const img = imgElementRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          if (dataUrl && dataUrl.startsWith('data:image')) {
            imageDataCache.set(currentKey, dataUrl);
            imageDataCache.set(src, dataUrl);
            setDisplayUrl(dataUrl);
            setIsLoaded(true);
            onEmbedImage?.(src, dataUrl, resolvedDiskPath || src);
            return;
          }
        }
      } catch (canvasErr) {
        console.warn('Canvas export failed:', canvasErr);
      }
    }

    // 6. Try converting displayUrl via fetch (works for asset://, blob:, http:, etc.)
    if (displayUrl) {
      try {
        const resp = await fetch(displayUrl);
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (dataUrl) {
            imageDataCache.set(currentKey, dataUrl);
            imageDataCache.set(src, dataUrl);
            setDisplayUrl(dataUrl);
            setIsLoaded(true);
            onEmbedImage?.(src, dataUrl, resolvedDiskPath || src);
          }
        };
        reader.readAsDataURL(blob);
        return;
      } catch {}
    }

    // 7. Fallback: prompt user to pick image file from disk
    handleManualPickImage(e);
  };

  const handleError = () => {
    // If it's a valid Data URL, do not fail
    if (displayUrl && displayUrl.startsWith('data:image')) {
      console.warn('Image error event ignored for valid data URL');
      setIsLoaded(true);
      return;
    }
    setLoadFailed(true);
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setLoadFailed(false);
  };

  // Keyboard shortcut (Escape to close lightbox)
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  // Calculate inline image style
  const imageStyle: React.CSSProperties = {
    ...style,
    maxWidth: parsedWidth ? `${parsedWidth}px` : '100%',
    width: parsedWidth && parsedHeight ? `${parsedWidth}px` : parsedWidth ? '100%' : undefined,
    height: parsedHeight ? `${parsedHeight}px` : 'auto',
  };

  const isDataUrl = Boolean(displayUrl && displayUrl.startsWith('data:'));
  const effectiveLoaded = isLoaded || isDataUrl;
  const filenameOnly = displayAlt || (src.startsWith('data:') ? '임베디드 이미지' : decodeURIComponent(src.split(/[/\\]/).pop() || src));

  // If loading completely failed
  if (loadFailed || !displayUrl) {
    return (
      <div
        onClick={handleManualPickImage}
        className="my-3 p-3.5 rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs font-mono flex items-center justify-between space-x-3 cursor-pointer hover:bg-amber-100/90 dark:hover:bg-amber-900/40 hover:border-amber-400 transition-all select-none max-w-xl shadow-xs group"
        title="클릭하여 디스크에서 이미지 파일 위치를 직접 선택하세요"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div className="flex items-center space-x-3 truncate">
          <ImageOff size={22} className="text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
          <div className="truncate">
            <div className="font-bold truncate text-sm mb-0.5">{filenameOnly}</div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 truncate">
              이미지를 디스크에서 찾을 수 없습니다. (클릭하여 직접 위치 지정)
            </div>
          </div>
        </div>

        <button
          onClick={handleManualPickImage}
          className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-sans text-xs font-bold shadow-xs cursor-pointer transition-colors"
        >
          <FolderOpen size={14} />
          <span>위치 지정</span>
        </button>
      </div>
    );
  }

  // Exclude duplicate/raw props from spreading into img tag
  const { src: _rawSrc, alt: _rawAlt, width: _w, height: _h, style: _st, node: _nd, ...restImgProps } = props;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <figure className="inline-block my-3 max-w-full group">
        <div className="relative inline-flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700/80 shadow-xs bg-gray-50 dark:bg-gray-800/30 max-w-full">
          {(resolvedDiskPath || isDataUrl) && (
            <div
              className="image-path-header flex items-center justify-between gap-2 px-2.5 py-1 text-[11px] font-mono text-white bg-neutral-900/95 dark:bg-neutral-950/95 border-b border-neutral-700/80 select-text max-w-full shadow-xs"
              style={{ maxWidth: imageStyle.maxWidth || '100%', color: '#ffffff', backgroundColor: '#171717' }}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate" title={resolvedDiskPath || displayAlt || 'Base64 Embedded Image'} style={{ color: '#ffffff' }}>
                {isDataUrl && !resolvedDiskPath ? (
                  <FileCode size={12} className="shrink-0 text-emerald-400" />
                ) : (
                  <FolderOpen size={12} className="shrink-0 text-sky-400" />
                )}
                <span className="image-path-text truncate font-medium text-white tracking-tight" style={{ color: '#ffffff' }}>
                  {resolvedDiskPath ? resolvedDiskPath : (displayAlt || 'Base64 임베디드 이미지')}
                </span>
              </div>
              {resolvedDiskPath ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(resolvedDiskPath);
                    setPathCopied(true);
                    setTimeout(() => setPathCopied(false), 1500);
                  }}
                  className="p-0.5 px-1.5 text-[10px] font-sans flex items-center gap-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition-colors shrink-0 cursor-pointer border border-neutral-700/80"
                  style={{ color: '#ffffff' }}
                  title="디스크 경로 복사"
                >
                  {pathCopied ? (
                    <>
                      <Check size={11} className="text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 font-semibold" style={{ color: '#34d399' }}>복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} className="shrink-0 text-neutral-300" />
                      <span className="text-white" style={{ color: '#ffffff' }}>복사</span>
                    </>
                  )}
                </button>
              ) : isDataUrl ? (
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 shrink-0" style={{ color: '#6ee7b7' }}>
                  Base64 임베딩됨
                </span>
              ) : null}
            </div>
          )}

          <div className="relative overflow-hidden">
            <img
              ref={imgElementRef}
              crossOrigin={displayUrl.startsWith('http') ? 'anonymous' : undefined}
              src={displayUrl}
              alt={displayAlt || filenameOnly}
              style={imageStyle}
              onError={handleError}
              onLoad={handleLoad}
              onClick={() => {
                setLightboxZoom(1);
                setLightboxOpen(true);
              }}
              className={`block object-contain cursor-zoom-in transition-all duration-200 hover:opacity-95 ${
                effectiveLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              decoding="async"
              {...restImgProps}
            />

            {/* Quick Actions Overlay Buttons on Hover */}
            {effectiveLoaded && (
              <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isDataUrl && onEmbedImage && (
                  <button
                    onClick={handleEmbedCurrentToMarkdown}
                    title="Markdown 본문에 Base64로 영구 임베딩 (단일 파일화)"
                    className="p-1.5 bg-black/60 hover:bg-emerald-600 text-white rounded-md backdrop-blur-xs cursor-pointer shadow-sm transition-colors"
                  >
                    <FileCode size={14} />
                  </button>
                )}
                <button
                  onClick={handleManualPickImage}
                  title="로컬 이미지 위치 수동 지정 / 변경"
                  className="p-1.5 bg-black/60 hover:bg-blue-600 text-white rounded-md backdrop-blur-xs cursor-pointer shadow-sm transition-colors"
                >
                  <FolderOpen size={14} />
                </button>
                <button
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxOpen(true);
                  }}
                  title="이미지 크게 보기"
                  className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md backdrop-blur-xs cursor-pointer shadow-sm transition-colors"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {displayAlt && displayAlt !== src && !displayAlt.startsWith('data:') && (
          <figcaption className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
            {displayAlt}
          </figcaption>
        )}
      </figure>

      {/* Interactive Lightbox Modal */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200 select-none"
        >
          {/* Lightbox Top Left Path Badge */}
          {(resolvedDiskPath || isDataUrl) && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="image-path-header absolute top-4 left-4 max-w-[50vw] flex items-center space-x-2 bg-gray-900/90 border border-gray-700 text-white px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md z-10 text-xs font-mono select-text"
              style={{ color: '#ffffff' }}
              title={resolvedDiskPath || displayAlt || 'Base64 Embedded Image'}
            >
              {isDataUrl && !resolvedDiskPath ? (
                <FileCode size={14} className="text-emerald-400 shrink-0" />
              ) : (
                <FolderOpen size={14} className="text-sky-400 shrink-0" />
              )}
              <span className="truncate text-white font-medium" style={{ color: '#ffffff' }}>
                {resolvedDiskPath || displayAlt || 'Base64 임베디드 이미지'}
              </span>
              {resolvedDiskPath && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(resolvedDiskPath);
                    setPathCopied(true);
                    setTimeout(() => setPathCopied(false), 1500);
                  }}
                  className="p-1 hover:bg-gray-800 text-gray-300 hover:text-white rounded transition-colors shrink-0 cursor-pointer"
                  style={{ color: '#ffffff' }}
                  title="경로 복사"
                >
                  {pathCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-neutral-300" />}
                </button>
              )}
            </div>
          )}

          {/* Lightbox Top Control Toolbar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 flex items-center space-x-2 bg-gray-900/90 border border-gray-700 text-white px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md z-10"
          >
            <span className="text-xs font-mono font-bold mr-2 text-gray-300">
              {Math.round(lightboxZoom * 100)}%
            </span>

            <button
              onClick={() => setLightboxZoom((prev) => Math.min(prev + 0.25, 4.0))}
              className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-200 transition-colors"
              title="확대"
            >
              <ZoomIn size={18} />
            </button>

            <button
              onClick={() => setLightboxZoom((prev) => Math.max(prev - 0.25, 0.5))}
              className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-200 transition-colors"
              title="축소"
            >
              <ZoomOut size={18} />
            </button>

            <button
              onClick={() => setLightboxZoom(1)}
              className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-200 transition-colors"
              title="100% 리셋"
            >
              <RotateCcw size={16} />
            </button>

            {!src.startsWith('data:') && onEmbedImage && (
              <button
                onClick={handleEmbedCurrentToMarkdown}
                className="p-1.5 hover:bg-emerald-600 rounded-lg text-gray-200 hover:text-white transition-colors"
                title="Markdown 본문에 Base64로 영구 임베딩 (단일 파일화)"
              >
                <FileCode size={18} />
              </button>
            )}

            <button
              onClick={handleManualPickImage}
              className="p-1.5 hover:bg-blue-600 rounded-lg text-gray-200 transition-colors"
              title="이미지 위치 직접 지정 / 다시 찾기"
            >
              <FolderOpen size={18} />
            </button>

            <div className="w-px h-5 bg-gray-700 mx-1" />

            <button
              onClick={() => setLightboxOpen(false)}
              className="p-1.5 hover:bg-red-600/80 rounded-lg text-gray-200 hover:text-white transition-colors"
              title="닫기 (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Lightbox Image Viewport */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-[95vw] max-h-[90vh] overflow-auto flex items-center justify-center p-2 scrollbar-none"
          >
            <img
              src={displayUrl}
              alt={displayAlt || src}
              style={{
                transform: `scale(${lightboxZoom})`,
                transition: 'transform 0.15s ease-out',
                maxWidth: '90vw',
                maxHeight: '85vh',
              }}
              className="object-contain rounded-lg shadow-2xl"
            />
          </div>

          {displayAlt && (
            <div className="absolute bottom-4 text-center text-sm font-medium text-gray-300 bg-gray-900/80 px-4 py-1.5 rounded-full backdrop-blur-xs border border-gray-700 max-w-xl truncate">
              {displayAlt}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export const MarkdownImage = memo(MarkdownImageComponent);

