import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { ThemeMode } from '../types';

interface ExternalChangeBannerProps {
  fileName: string;
  isModified?: boolean;
  theme: ThemeMode;
  onReload: () => void;
  onKeep: () => void;
  onDismiss: () => void;
}

export const ExternalChangeBanner: React.FC<ExternalChangeBannerProps> = ({
  fileName,
  isModified,
  theme,
  onReload,
  onKeep,
  onDismiss,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(3);

  // 3-second auto-keep countdown timer
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onKeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [onKeep]);

  const bgStyles =
    theme === 'dark'
      ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
      : theme === 'sepia'
      ? 'bg-amber-100/95 border-amber-400 text-amber-900 shadow-sm'
      : 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm';

  const reloadBtnStyles =
    theme === 'dark'
      ? 'bg-amber-500 hover:bg-amber-400 text-gray-950 font-medium'
      : 'bg-amber-600 hover:bg-amber-700 text-white font-medium';

  const keepBtnStyles =
    theme === 'dark'
      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600'
      : theme === 'sepia'
      ? 'bg-[#e8dec8] hover:bg-[#ded1b8] text-amber-950 border border-amber-300'
      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300';

  return (
    <div
      className={`w-full border-b px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-1 z-30 relative overflow-hidden ${bgStyles}`}
      role="alert"
    >
      {/* 3s countdown progress line at the bottom */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-amber-500/60 transition-all ease-linear"
        style={{
          width: '100%',
          animation: 'bannerProgress 3s linear forwards',
        }}
      />

      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0 p-1 rounded-full bg-amber-500/20 text-amber-500">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
        </div>
        <div className="text-xs sm:text-sm font-medium leading-tight truncate">
          <span>
            외부 프로그램(Obsidian 등)에서 <strong className="underline underline-offset-2">"{fileName}"</strong> 파일이 수정되었습니다.
          </span>
          <span className="ml-2 text-xs opacity-75 font-normal">
            ({secondsLeft}초 후 자동 유지)
          </span>
          {isModified && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
              현재 작성 중인 미저장 내용 있음
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onReload}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md shadow-xs transition-colors cursor-pointer ${reloadBtnStyles}`}
          title="디스크의 최신 내용으로 문서를 다시 불러옵니다."
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>다시 불러오기 (Reload)</span>
        </button>

        <button
          type="button"
          onClick={onKeep}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${keepBtnStyles}`}
          title="현재 편집 중인 내용을 그대로 유지합니다."
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>현재 내용 유지 ({secondsLeft}s)</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-current"
          title="알림 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        @keyframes bannerProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
