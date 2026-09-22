import React from 'react';
import { Search, Plus, Filter, Folder, ArrowUpDown, X } from 'lucide-react';
import { ClassItem, SortOrder } from '../types';

interface ClassFilterProps {
  classes: ClassItem[];
  selectedClassId: string | null;
  onSelectClass: (classId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOrder: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  onOpenClassManager: () => void;
  classNoteCounts: Record<string, number>;
  totalNotesCount: number;
}

export const ClassFilter: React.FC<ClassFilterProps> = ({
  classes,
  selectedClassId,
  onSelectClass,
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
  onOpenClassManager,
  classNoteCounts,
  totalNotesCount,
}) => {
  return (
    <div id="class-filter-section" className="space-y-4 mb-6">
      {/* Top Bar: Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="search-notes-input"
            type="text"
            placeholder="Search notes by title, transcript keywords, or AI summary..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-xs"
          />
          {searchQuery && (
            <button
              id="clear-search-btn"
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort selector & Manage Classes */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              id="sort-order-select"
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as SortOrder)}
              aria-label="Sort notes by"
              className="pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-xs cursor-pointer appearance-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="duration">Longest Audio</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          <button
            id="manage-classes-btn"
            type="button"
            onClick={onOpenClassManager}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Folder className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
            <span>Manage Classes</span>
          </button>
        </div>
      </div>

      {/* Class Category Pills Bar */}
      <div
        id="class-pills-bar"
        className="flex items-center gap-2 overflow-x-auto p-1.5 px-2 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800 shadow-xs no-scrollbar text-xs scroll-smooth"
      >
        {/* "All Classes" Pill */}
        <button
          id="filter-class-all"
          type="button"
          onClick={() => onSelectClass(null)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
            selectedClassId === null
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
          }`}
        >
          <span>All Classes</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedClassId === null
                ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-950'
                : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
            }`}
          >
            {totalNotesCount}
          </span>
        </button>

        {/* Individual Class Pills */}
        {classes.map((cls) => {
          const isSelected = selectedClassId === cls.id;
          const count = classNoteCounts[cls.id] || 0;

          return (
            <button
              key={cls.id}
              id={`filter-class-${cls.id}`}
              type="button"
              onClick={() => onSelectClass(cls.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer border ${
                isSelected
                  ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: cls.color }}
              />
              <span>{cls.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected
                    ? 'bg-indigo-200/60 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Quick Add Class Button */}
        <button
          id="quick-add-class-btn"
          type="button"
          onClick={onOpenClassManager}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>New Class</span>
        </button>
      </div>
    </div>
  );
};
