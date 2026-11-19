import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  showLabel = false,
}) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 shrink-0" />
      )}
      {showLabel && (
        <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
      )}
    </button>
  );
};
