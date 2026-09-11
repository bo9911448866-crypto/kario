import React, { useState } from 'react';
import {
  Folder,
  Mic,
  Search,
  SlidersHorizontal,
  Edit,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  ArrowLeft,
  Grid,
  List as ListIcon,
} from 'lucide-react';
import { ClassItem, VoiceNote } from '../types';
import { NoteCard } from './NoteCard';

interface ClassFolderWindowProps {
  classItem: ClassItem;
  notes: VoiceNote[];
  allClasses: ClassItem[];
  onOpenRecorderWithClass: (classId: string) => void;
  onEditClass: (classItem: ClassItem) => void;
  onDeleteClass?: (classId: string) => void;
  onSummarizeNote: (note: VoiceNote) => void;
  onDeleteNote: (id: string) => void;
  onMoveNoteToClass: (noteId: string, targetClassId: string) => void;
  onEditNote: (note: VoiceNote) => void;
  onOpenSettings?: () => void;
}

export const ClassFolderWindow: React.FC<ClassFolderWindowProps> = ({
  classItem,
  notes,
  allClasses,
  onOpenRecorderWithClass,
  onEditClass,
  onDeleteClass,
  onSummarizeNote,
  onDeleteNote,
  onMoveNoteToClass,
  onEditNote,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Filter notes for this specific class
  const classNotes = notes.filter((n) => n.classId === classItem.id);

  const filteredNotes = classNotes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.transcript.toLowerCase().includes(q) ||
      n.summary?.summary.toLowerCase().includes(q) ||
      n.summary?.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const totalDurationSeconds = classNotes.reduce((acc, n) => acc + (n.durationSeconds || 0), 0);
  const totalMinutes = Math.round(totalDurationSeconds / 60);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0c0818]/60 select-text">
      {/* Folder Navigation Toolbar */}
      <div className="p-4 border-b border-slate-200/80 dark:border-purple-950/80 bg-white/80 dark:bg-[#110b24]/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-purple-300/80">
          <span className="font-semibold text-slate-700 dark:text-purple-200">Root</span>
          <span>/</span>
          <span>Classes</span>
          <span>/</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: classItem.color }}
            />
            <span className="truncate max-w-[150px]">{classItem.name}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Record into this class */}
          <button
            type="button"
            onClick={() => onOpenRecorderWithClass(classItem.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-xs hover:shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Record in Folder</span>
          </button>

          {/* Edit Class */}
          <button
            type="button"
            onClick={() => onEditClass(classItem)}
            title="Edit Folder Name & Color"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-purple-950 bg-white dark:bg-purple-950/30 text-slate-600 dark:text-purple-300 hover:bg-slate-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>

          {/* Delete Folder */}
          {onDeleteClass && (
            <>
              {isConfirmingDelete ? (
                <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 p-1 rounded-xl border border-rose-200 dark:border-rose-900">
                  <span className="text-[10px] text-rose-600 dark:text-rose-300 font-semibold px-1">
                    Delete folder?
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteClass(classItem.id)}
                    className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  title="Delete this class folder"
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-purple-950 bg-white dark:bg-purple-950/30 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}

          {/* Toggle View Mode */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-purple-950/40 border border-slate-300/60 dark:border-purple-900/40">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-purple-900 text-purple-700 dark:text-purple-200 shadow-xs'
                  : 'text-slate-500 dark:text-purple-400 hover:text-slate-800'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-purple-900 text-purple-700 dark:text-purple-200 shadow-xs'
                  : 'text-slate-500 dark:text-purple-400 hover:text-slate-800'
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sub-bar: Search & Folder Stats */}
      <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-[#0e0a1f]/60 border-b border-slate-200/60 dark:border-purple-950/60 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-purple-300/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${classNotes.length} notes in ${classItem.name}...`}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#150f2b] border border-slate-200 dark:border-purple-900/50 text-slate-800 dark:text-purple-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span>
            <strong className="text-slate-700 dark:text-purple-200">{filteredNotes.length}</strong> items
          </span>
          <span>&bull;</span>
          <span>
            <strong className="text-slate-700 dark:text-purple-200">{totalMinutes}m</strong> audio
          </span>
        </div>
      </div>

      {/* Notes Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 mb-3 border border-purple-200/60 dark:border-purple-900/40">
              <Folder className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-purple-100">
              {searchQuery ? 'No matching notes in this folder' : `This folder is empty`}
            </h4>
            <p className="text-xs text-slate-500 dark:text-purple-400/80 max-w-xs mt-1">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : `No voice notes have been assigned to ${classItem.name} yet.`}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => onOpenRecorderWithClass(classItem.id)}
                className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Record First Note Here</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                classes={allClasses}
                currentClass={classItem}
                onSummarize={onSummarizeNote}
                onDelete={onDeleteNote}
                onMoveToClass={onMoveNoteToClass}
                onEdit={onEditNote}
                cardStyle="solid"
                onOpenSettings={onOpenSettings}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
