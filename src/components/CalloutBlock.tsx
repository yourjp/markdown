import React, { ReactNode, useState } from 'react';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  Bookmark,
  Quote,
  Flame,
  Bug,
  Sparkles,
  ClipboardList,
  CheckSquare,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface CalloutConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor?: string;
  titleColor: string;
  borderColor: string;
  bgLight: string;
  bgDark: string;
  defaultTitle: string;
}

const CALLOUT_CONFIGS: Record<string, CalloutConfig> = {
  // Note
  note: {
    icon: Info,
    iconColor: 'text-blue-500 dark:text-blue-400',
    titleColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-l-blue-500 dark:border-l-blue-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Note',
  },
  // Abstract, Summary, TLDR
  abstract: {
    icon: ClipboardList,
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    titleColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-l-cyan-500 dark:border-l-cyan-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Abstract',
  },
  summary: {
    icon: ClipboardList,
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    titleColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-l-cyan-500 dark:border-l-cyan-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Summary',
  },
  tldr: {
    icon: ClipboardList,
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    titleColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-l-cyan-500 dark:border-l-cyan-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'TL;DR',
  },
  // Info
  info: {
    icon: Info,
    iconColor: 'text-blue-500 dark:text-blue-400',
    titleColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-l-blue-500 dark:border-l-blue-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Info',
  },
  // Todo
  todo: {
    icon: CheckSquare,
    iconColor: 'text-blue-500 dark:text-blue-400',
    titleColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-l-blue-500 dark:border-l-blue-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Todo',
  },
  // Tip, Hint
  tip: {
    icon: Lightbulb,
    iconColor: 'text-amber-500 dark:text-yellow-300',
    titleColor: 'text-gray-800 dark:text-gray-100',
    borderColor: 'border-l-gray-400 dark:border-l-slate-500',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Tip',
  },
  hint: {
    icon: Lightbulb,
    iconColor: 'text-amber-500 dark:text-yellow-300',
    titleColor: 'text-gray-800 dark:text-gray-100',
    borderColor: 'border-l-gray-400 dark:border-l-slate-500',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Hint',
  },
  important: {
    icon: Sparkles,
    iconColor: 'text-cyan-500 dark:text-cyan-300',
    titleColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-l-cyan-500 dark:border-l-cyan-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Important',
  },
  // Success, Check, Done
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    titleColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-l-emerald-500 dark:border-l-emerald-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Success',
  },
  check: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    titleColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-l-emerald-500 dark:border-l-emerald-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Check',
  },
  done: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    titleColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-l-emerald-500 dark:border-l-emerald-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Done',
  },
  // Question, Help, FAQ
  question: {
    icon: HelpCircle,
    iconColor: 'text-purple-500 dark:text-purple-300',
    titleColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-l-purple-500 dark:border-l-purple-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Question',
  },
  help: {
    icon: HelpCircle,
    iconColor: 'text-purple-500 dark:text-purple-300',
    titleColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-l-purple-500 dark:border-l-purple-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Help',
  },
  faq: {
    icon: HelpCircle,
    iconColor: 'text-purple-500 dark:text-purple-300',
    titleColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-l-purple-500 dark:border-l-purple-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'FAQ',
  },
  // Warning, Caution, Attention
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-300',
    titleColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-l-amber-500 dark:border-l-amber-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Warning',
  },
  caution: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-300',
    titleColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-l-amber-500 dark:border-l-amber-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Caution',
  },
  attention: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-300',
    titleColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-l-amber-500 dark:border-l-amber-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Attention',
  },
  // Failure, Fail, Missing
  failure: {
    icon: XCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-l-red-500 dark:border-l-red-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Failure',
  },
  fail: {
    icon: XCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-l-red-500 dark:border-l-red-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Fail',
  },
  missing: {
    icon: XCircle,
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-l-red-500 dark:border-l-red-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Missing',
  },
  // Danger, Error
  danger: {
    icon: Flame,
    iconColor: 'text-rose-500 dark:text-rose-400',
    titleColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-l-rose-500 dark:border-l-rose-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Danger',
  },
  error: {
    icon: AlertOctagon,
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-l-red-500 dark:border-l-red-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Error',
  },
  // Bug
  bug: {
    icon: Bug,
    iconColor: 'text-red-500 dark:text-red-400',
    titleColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-l-red-500 dark:border-l-red-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Bug',
  },
  // Example
  example: {
    icon: Bookmark,
    iconColor: 'text-indigo-500 dark:text-indigo-300',
    titleColor: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-l-indigo-500 dark:border-l-indigo-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Example',
  },
  // Quote, Cite
  quote: {
    icon: Quote,
    iconColor: 'text-slate-500 dark:text-slate-300',
    titleColor: 'text-slate-700 dark:text-slate-200',
    borderColor: 'border-l-slate-400 dark:border-l-slate-500',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Quote',
  },
  cite: {
    icon: Quote,
    iconColor: 'text-slate-500 dark:text-slate-300',
    titleColor: 'text-slate-700 dark:text-slate-200',
    borderColor: 'border-l-slate-400 dark:border-l-slate-500',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: 'Cite',
  },
};

interface CalloutBlockProps {
  children?: ReactNode;
  [key: string]: any;
}

// Helper to inspect if children starts with [!type] or [!type]+ or [!type]-
function parseCallout(children: ReactNode): {
  isCallout: boolean;
  type: string;
  collapseSign: string; // '+' | '-' | ''
  title: string;
  body: ReactNode;
} {
  // Filter out pure whitespace string nodes at the root of blockquote
  const rawChildArray = React.Children.toArray(children);
  const childArray = rawChildArray.filter(
    (c) => typeof c !== 'string' || c.trim().length > 0
  );

  if (childArray.length === 0) {
    return { isCallout: false, type: '', collapseSign: '', title: '', body: children };
  }

  const firstChild = childArray[0];

  // Helper to test if a string starts with [!type]
  const matchCalloutHeader = (text: string) => {
    return text.match(/^\s*\[!([a-zA-Z0-9_-]+)\]([+-]?)(?:[ \t]*(.*))?$/);
  };

  // Case 1: First child is a <p> element (standard react-markdown output)
  if (React.isValidElement(firstChild) && (firstChild.props as any)) {
    const rawPChildren = React.Children.toArray((firstChild.props as any).children);
    // Find the first non-empty text child in <p>
    const firstTextIndex = rawPChildren.findIndex(
      (c) => typeof c === 'string' && c.trim().length > 0
    );

    if (firstTextIndex !== -1) {
      const text = rawPChildren[firstTextIndex] as string;
      const match = matchCalloutHeader(text);
      if (match) {
        const type = match[1].toLowerCase();
        const collapseSign = match[2] || '';
        const headerTitle = (match[3] || '').trim();

        // Remaining elements inside the first <p> after the callout marker
        const remainingInP = rawPChildren.slice(firstTextIndex + 1);
        const restOfBlockquote = childArray.slice(1);

        const bodyElements: ReactNode[] = [];

        // Check if the matched text line itself had additional text after a newline
        if (headerTitle.includes('\n')) {
          const parts = headerTitle.split('\n');
          const title = parts[0].trim();
          const remainderText = parts.slice(1).join('\n');
          bodyElements.push(
            <p key="callout-p0" className="my-1">
              {remainderText}
              {remainingInP}
            </p>
          );
          return {
            isCallout: true,
            type,
            collapseSign,
            title,
            body: [...bodyElements, ...restOfBlockquote],
          };
        } else {
          // If there are other elements in the first <p> (like <br /> and further text)
          const filteredRemainingInP = remainingInP.filter(
            (c) => typeof c !== 'string' || c.trim().length > 0
          );
          if (filteredRemainingInP.length > 0) {
            bodyElements.push(
              <p key="callout-p0" className="my-1">
                {remainingInP}
              </p>
            );
          }
          return {
            isCallout: true,
            type,
            collapseSign,
            title: headerTitle,
            body: [...bodyElements, ...restOfBlockquote],
          };
        }
      }
    }
  }

  // Case 2: First child is directly a string
  if (typeof firstChild === 'string') {
    const match = matchCalloutHeader(firstChild);
    if (match) {
      const type = match[1].toLowerCase();
      const collapseSign = match[2] || '';
      const title = (match[3] || '').trim();
      return {
        isCallout: true,
        type,
        collapseSign,
        title,
        body: childArray.slice(1),
      };
    }
  }

  return { isCallout: false, type: '', collapseSign: '', title: '', body: children };
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({ children, 'data-source-line': dataSourceLine, ...props }) => {
  const lineAttr = dataSourceLine ?? props.dataSourceLine;
  const { isCallout, type, collapseSign, title, body } = parseCallout(children);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => collapseSign === '-');

  if (!isCallout) {
    return (
      <blockquote
        data-line-index={lineAttr}
        className="callout-block border-l-4 border-gray-400 dark:border-gray-500 bg-[#f1f5f9] dark:bg-slate-950 px-4 py-3 my-4 rounded-r-lg italic text-gray-800 dark:text-gray-200"
        {...props}
      >
        {children}
      </blockquote>
    );
  }

  const config = CALLOUT_CONFIGS[type] || {
    icon: Sparkles,
    titleColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-l-blue-500 dark:border-l-blue-400',
    bgLight: 'bg-[#f1f5f9]',
    bgDark: 'dark:bg-slate-950',
    defaultTitle: type.charAt(0).toUpperCase() + type.slice(1),
  };

  const IconComponent = config.icon;
  const displayTitle = title || config.defaultTitle;
  const isCollapsible = collapseSign === '+' || collapseSign === '-';

  return (
    <div
      data-line-index={lineAttr}
      className={`callout-block my-4 rounded-lg border border-gray-200 dark:border-gray-700/80 border-l-4 ${config.borderColor} ${config.bgLight} ${config.bgDark} p-4 shadow-2xs transition-colors`}
    >
      {/* Callout Header */}
      <div
        onClick={isCollapsible ? () => setIsCollapsed((prev) => !prev) : undefined}
        className={`flex items-center justify-between font-bold text-sm ${config.titleColor} select-none ${
          isCollapsible ? 'cursor-pointer hover:opacity-80' : ''
        } ${!isCollapsed ? 'mb-2' : ''}`}
      >
        <div className="flex items-center space-x-2">
          <IconComponent size={19} className={`shrink-0 ${config.iconColor || ''}`} />
          <span className="capitalize tracking-wide font-semibold">{displayTitle}</span>
        </div>

        {isCollapsible && (
          <button
            type="button"
            className="p-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="콜아웃 접기/펼치기"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Callout Body Content */}
      {!isCollapsed && (
        <div className="text-sm text-gray-800 dark:text-gray-200 pl-6 leading-relaxed [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5 animate-in fade-in duration-150">
          {body}
        </div>
      )}
    </div>
  );
};
