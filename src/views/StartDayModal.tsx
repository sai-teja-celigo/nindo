import React, { useState } from 'react';
import { Task } from '../../shared/types';
import { Star, Play, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface StartDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayTasks: Task[];
  onConfirmStartDay: (committedTaskIds: string[], mustWinTaskId?: string) => Promise<void>;
}

export const StartDayModal: React.FC<StartDayModalProps> = ({
  isOpen,
  onClose,
  todayTasks,
  onConfirmStartDay,
}) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(todayTasks.map((t) => t.id));
  const [mustWinId, setMustWinId] = useState<string | undefined>(
    todayTasks.length > 0 ? todayTasks[0].id : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTask = (id: string) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter((tId) => tId !== id));
      if (mustWinId === id) setMustWinId(undefined);
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const handleStart = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmStartDay(selectedTaskIds, mustWinId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Morning Commitment</h2>
            <p className="text-xs text-slate-400">
              Lock in your tasks for today. Once committed, tasks added later won't artificially alter your score.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Today's Tasks ({selectedTaskIds.length} selected)</span>
            <span>⭐ Must Win Task</span>
          </div>

          {todayTasks.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-slate-400 text-sm">
              No tasks scheduled for today. Add tasks before starting your day!
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {todayTasks.map((task) => {
                const isChecked = selectedTaskIds.includes(task.id);
                const isMW = mustWinId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isChecked
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTask(task.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {task.title}
                      </span>
                    </label>

                    {isChecked && (
                      <button
                        type="button"
                        onClick={() => setMustWinId(isMW ? undefined : task.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isMW
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-amber-400'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isMW ? 'fill-slate-950' : ''}`} />
                        Must Win
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {mustWinId && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
              <span>
                Must Win selected:{' '}
                <strong>
                  {todayTasks.find((t) => t.id === mustWinId)?.title}
                </strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            {isSubmitting ? 'Starting...' : 'Start Day'}
          </button>
        </div>
      </div>
    </div>
  );
};
