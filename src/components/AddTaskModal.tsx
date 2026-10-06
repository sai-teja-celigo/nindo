import React, { useState } from 'react';
import { UserConfig } from '../../shared/types';
import { getToday } from '../../shared/dateUtils';
import { X, Calendar, PlusCircle } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserConfig[];
  activeUserId: string;
  onAddTask: (taskData: {
    title: string;
    owner: string;
    dueDateShortcut: string;
    customDueDate?: string;
  }) => Promise<void>;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  users,
  activeUserId,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState(activeUserId);
  const [shortcut, setShortcut] = useState('today');
  const [customDate, setCustomDate] = useState(getToday());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const shortcuts = [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'weekend', label: 'Weekend' },
    { id: '+7', label: '+7 days' },
    { id: 'month', label: 'Month end' },
    { id: '+30', label: '+30 days' },
    { id: 'custom', label: 'Custom' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddTask({
        title,
        owner,
        dueDateShortcut: shortcut,
        customDueDate: shortcut === 'custom' ? customDate : undefined,
      });
      setTitle('');
      setShortcut('today');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-100">Add New Task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish CDC debugging"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Owner */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Owner
            </label>
            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setOwner(u.id)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                    owner === u.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{u.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Due Date Shortcuts */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Due Date
            </label>
            <div className="flex flex-wrap gap-2">
              {shortcuts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShortcut(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    shortcut === s.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {shortcut === 'custom' && (
              <div className="mt-3">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
