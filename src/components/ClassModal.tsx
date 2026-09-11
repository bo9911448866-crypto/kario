import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, Folder, AlertTriangle } from 'lucide-react';
import { ClassItem, VoiceNote } from '../types';
import { CLASS_COLORS, StorageService } from '../services/StorageService';

interface ClassModalProps {
  classes: ClassItem[];
  notes: VoiceNote[];
  onClassesUpdated: (classes: ClassItem[], notes?: VoiceNote[]) => void;
  onClose: () => void;
}

export const ClassModal: React.FC<ClassModalProps> = ({
  classes,
  notes,
  onClassesUpdated,
  onClose,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Form states
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete confirmation
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const startCreate = () => {
    setClassName('');
    setClassDescription('');
    setSelectedColorIndex(classes.length % CLASS_COLORS.length);
    setErrorMsg(null);
    setEditingClassId(null);
    setIsCreating(true);
  };

  const startEdit = (cls: ClassItem) => {
    setClassName(cls.name);
    setClassDescription(cls.description || '');
    const colorIdx = CLASS_COLORS.findIndex((c) => c.color === cls.color);
    setSelectedColorIndex(colorIdx >= 0 ? colorIdx : 0);
    setErrorMsg(null);
    setIsCreating(false);
    setEditingClassId(cls.id);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingClassId(null);
    setErrorMsg(null);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setErrorMsg('Class name cannot be empty.');
      return;
    }

    const colorScheme = CLASS_COLORS[selectedColorIndex % CLASS_COLORS.length];

    if (isCreating) {
      // Check duplicate
      if (classes.some((c) => c.name.toLowerCase() === className.trim().toLowerCase())) {
        setErrorMsg('A class with this name already exists.');
        return;
      }

      const newCls = StorageService.createClass(
        className.trim(),
        selectedColorIndex,
        classDescription.trim()
      );
      onClassesUpdated([...classes, newCls]);
      cancelForm();
    } else if (editingClassId) {
      const updated = StorageService.updateClass(editingClassId, {
        name: className.trim(),
        description: classDescription.trim(),
        color: colorScheme.color,
        bgColor: colorScheme.bgColor,
        textColor: colorScheme.textColor,
        borderColor: colorScheme.borderColor,
      });
      onClassesUpdated(updated);
      cancelForm();
    }
  };

  const handleDeleteClass = (idToDelete: string) => {
    const fallback = classes.find((c) => c.id !== idToDelete);
    const { classes: updatedClasses, notes: updatedNotes } = StorageService.deleteClass(
      idToDelete,
      fallback?.id
    );
    onClassesUpdated(updatedClasses, updatedNotes);
    setDeletingClassId(null);
  };

  return (
    <div
      id="class-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="class-manager-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Manage Classes & Subjects
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize lectures, tag folders, and customize class tags
              </p>
            </div>
          </div>
          <button
            id="close-class-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Create or Edit Form */}
          {(isCreating || editingClassId) && (
            <form
              onSubmit={handleSaveClass}
              className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                {isCreating ? 'Create New Class' : 'Edit Class'}
              </h3>

              {errorMsg && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errorMsg}
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="class-name-input"
                  type="text"
                  placeholder="e.g., Organic Chemistry, Calculus III"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  id="class-desc-input"
                  type="text"
                  placeholder="e.g., Professor Adams, MWF 10:00 AM"
                  value={classDescription}
                  onChange={(e) => setClassDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {CLASS_COLORS.map((col, idx) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`h-7 w-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                        selectedColorIndex === idx
                          ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: col.color }}
                      title={col.name}
                    >
                      {selectedColorIndex === idx && (
                        <Check className="h-3.5 w-3.5 text-white stroke-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-class-submit-btn"
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isCreating ? 'Create Class' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* New Class Trigger button if not currently editing/creating */}
          {!isCreating && !editingClassId && (
            <button
              id="add-new-class-banner-btn"
              type="button"
              onClick={startCreate}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Class</span>
            </button>
          )}

          {/* Class List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Existing Classes ({classes.length})
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {classes.map((cls) => {
                const noteCount = notes.filter((n) => n.classId === cls.id).length;
                const isConfirmingDelete = deletingClassId === cls.id;

                return (
                  <div
                    key={cls.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: cls.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {cls.name}
                          </span>
                          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {noteCount} note{noteCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {cls.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {cls.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200 dark:border-rose-900">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                            Delete?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(cls.id)}
                            className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingClassId(null)}
                            className="px-1.5 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(cls)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit class"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {classes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDeletingClassId(cls.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete class"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
