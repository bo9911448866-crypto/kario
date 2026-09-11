import React from 'react';
import { X, Minus, Square, Maximize2 } from 'lucide-react';

interface DesktopWindowFrameProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onFocus: () => void;
  children: React.ReactNode;
  width?: string;
  maxWidth?: string;
  height?: string;
  headerExtra?: React.ReactNode;
}

export const DesktopWindowFrame: React.FC<DesktopWindowFrameProps> = ({
  id,
  title,
  icon,
  isOpen,
  isMinimized,
  isMaximized,
  zIndex,
  onClose,
  onMinimize,
  onToggleMaximize,
  onFocus,
  children,
  width = 'w-11/12 sm:w-4/5 lg:w-3/4',
  maxWidth = 'max-w-5xl',
  height = 'h-[80vh]',
  headerExtra,
}) => {
  if (!isOpen || isMinimized) return null;

  return (
    <div
      id={`window-${id}`}
      onClick={onFocus}
      style={{ zIndex }}
      className={`fixed transition-all duration-200 flex flex-col ${
        isMaximized
          ? 'inset-x-0 bottom-16 top-9 w-full h-[calc(100vh-6.25rem)] rounded-none'
          : `${width} ${maxWidth} ${height} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl shadow-black/40`
      } border border-slate-200/80 dark:border-purple-900/60 bg-white/95 dark:bg-[#0d091a]/95 backdrop-blur-xl overflow-hidden`}
    >
      {/* Window Titlebar */}
      <div
        className="h-10 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-purple-950/80 bg-slate-100/90 dark:bg-[#130d26]/90 select-none cursor-default shrink-0"
        onDoubleClick={onToggleMaximize}
      >
        {/* Window Traffic Lights */}
        <div className="flex items-center gap-2 w-24">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close Window"
            className="h-3 w-3 rounded-full bg-rose-500 hover:bg-rose-600 border border-rose-600 flex items-center justify-center group cursor-pointer"
          >
            <X className="h-2 w-2 text-rose-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title="Minimize Window"
            className="h-3 w-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500 flex items-center justify-center group cursor-pointer"
          >
            <Minus className="h-2 w-2 text-amber-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMaximize();
            }}
            title={isMaximized ? 'Restore Window' : 'Maximize Window'}
            className="h-3 w-3 rounded-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 flex items-center justify-center group cursor-pointer"
          >
            <Maximize2 className="h-1.5 w-1.5 text-emerald-950 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Window Title */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-purple-200 truncate px-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </div>

        {/* Header Extra Actions */}
        <div className="flex items-center justify-end gap-2 w-24">
          {headerExtra}
        </div>
      </div>

      {/* Window Body Area */}
      <div className="flex-1 overflow-y-auto relative flex flex-col">
        {children}
      </div>
    </div>
  );
};
