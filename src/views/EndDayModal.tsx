import React, { useState } from 'react';
import { Task, DailyHabit, MoodType, ProductivityReason } from '../../shared/types';
import { CheckCircle2, XCircle, AlertCircle, Smile, Meh, Frown, Annoyed, ArrowRight, Star } from 'lucide-react';

interface EndDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  committedTasks: Task[];
  habits: DailyHabit[];
  mustWinTaskId?: string;
  onFinishDay: (payload: {
    completedTasks: string[];
    completedHabits: string[];
    mustWinCompleted?: boolean;
    mood: MoodType;
    optionalReason?: ProductivityReason | string;
    rollovers: { taskId: string; newDateShortcut: string }[];
    droppedTaskIds: string[];
  }) => Promise<void>;
}

export const EndDayModal: React.FC<EndDayModalProps> = ({
  isOpen,
  onClose,
  committedTasks,
  habits,
  mustWinTaskId,
  onFinishDay,
}) => {
  // Local state for incomplete tasks handling
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(
    committedTasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id)
  );

  const [completedHabitIds, setCompletedHabitIds] = useState<string[]>([]);
  
  // Track action for incomplete tasks: map taskId -> 'tomorrow' | 'weekend' | '+7' | 'drop'
  const [incompleteActions, setIncompleteActions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    committedTasks.forEach((t) => {
      if (t.status !== 'COMPLETED') {
        initial[t.id] = 'tomorrow'; // default requirement: Tomorrow
      }
    });
    return initial;
  });

  const [mood, setMood] = useState<MoodType>('HAPPY');
  const [optionalReason, setOptionalReason] = useState<ProductivityReason | string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const incompleteTasks = committedTasks.filter((t) => !completedTaskIds.includes(t.id));
  const mustWinTask = committedTasks.find((t) => t.id === mustWinTaskId);
  const isMustWinCompleted = mustWinTaskId ? completedTaskIds.includes(mustWinTaskId) : undefined;

  const moods: { type: MoodType; label: string; icon: string }[] = [
    { type: 'HAPPY', label: '😄 Happy', icon: '😄' },
    { type: 'NOT_AS_PRODUCTIVE', label: '🙂 Not as productive as I thought', icon: '🙂' },
    { type: 'BAD', label: '😕 Bad', icon: '😕' },
    { type: 'WORSE', label: '😫 Worse', icon: '😫' },
  ];

  const reasons: ProductivityReason[] = [
    'Distracted',
    'Task was too big',
    'Unexpected work',
    'Low energy',
    'Blocked',
    "Didn't have enough time",
    'Other',
  ];

  const toggleTaskCompleted = (id: string) => {
    if (completedTaskIds.includes(id)) {
      setCompletedTaskIds(completedTaskIds.filter((tId) => tId !== id));
      if (!incompleteActions[id]) {
        setIncompleteActions((prev) => ({ ...prev, [id]: 'tomorrow' }));
      }
    } else {
      setCompletedTaskIds([...completedTaskIds, id]);
    }
  };

  const toggleHabitCompleted = (id: string) => {
    if (completedHabitIds.includes(id)) {
      setCompletedHabitIds(completedHabitIds.filter((hId) => hId !== id));
    } else {
      setCompletedHabitIds([...completedHabitIds, id]);
    }
  };

  const handleActionChange = (taskId: string, action: string) => {
    setIncompleteActions((prev) => ({ ...prev, [taskId]: action }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const rollovers: { taskId: string; newDateShortcut: string }[] = [];
      const droppedTaskIds: string[] = [];

      Object.entries(incompleteActions).forEach(([taskId, action]) => {
        if (!completedTaskIds.includes(taskId)) {
          if (action === 'drop') {
            droppedTaskIds.push(taskId);
          } else {
            rollovers.push({ taskId, newDateShortcut: action });
          }
        }
      });

      await onFinishDay({
        completedTasks: completedTaskIds,
        completedHabits: completedHabitIds,
        mustWinCompleted: isMustWinCompleted,
        mood,
        optionalReason: optionalReason || undefined,
        rollovers,
        droppedTaskIds,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-100">End-of-Day Review</h2>
            <p className="text-xs text-slate-400">
              Reflect on your day, handle incomplete tasks, and lock in today's productivity score.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
            EOD Review
          </span>
        </div>

        <div className="mt-5 space-y-6">
          {/* Section 1: Tasks Review */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Today's Tasks ({completedTaskIds.length} / {committedTasks.length} completed)
            </h3>
            <div className="space-y-2">
              {committedTasks.map((task) => {
                const isDone = completedTaskIds.includes(task.id);
                const isMW = task.id === mustWinTaskId;

                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggleTaskCompleted(task.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                        />
                        <span
                          className={`text-sm font-medium ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-100'
                          }`}
                        >
                          {task.title}
                        </span>
                      </label>

                      {isMW && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Star className="w-3 h-3 fill-amber-300" /> Must Win
                        </span>
                      )}
                    </div>

                    {/* Handling incomplete tasks prompt */}
                    {!isDone && (
                      <div className="pl-7 pt-1 flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        <span>Move to:</span>
                        {['tomorrow', 'weekend', '+7', 'drop'].map((act) => (
                          <button
                            key={act}
                            type="button"
                            onClick={() => handleActionChange(task.id, act)}
                            className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                              incompleteActions[task.id] === act
                                ? act === 'drop'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {act === 'drop' ? 'Drop task' : act === '+7' ? '+7 days' : act}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Daily Habits Review */}
          {habits.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Daily Habits ({completedHabitIds.length} / {habits.length} completed)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {habits.map((habit) => {
                  const isChecked = completedHabitIds.includes(habit.id);
                  return (
                    <label
                      key={habit.id}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleHabitCompleted(habit.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-sm font-medium">{habit.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Summary Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="block text-xs font-semibold uppercase text-slate-400">Tasks</span>
              <span className="text-lg font-bold text-slate-100">
                {completedTaskIds.length} / {committedTasks.length}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase text-slate-400">Habits</span>
              <span className="text-lg font-bold text-slate-100">
                {completedHabitIds.length} / {habits.length}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase text-slate-400">Must Win</span>
              <span className="text-lg font-bold">
                {mustWinTaskId ? (
                  isMustWinCompleted ? (
                    <span className="text-emerald-400">✅ Completed</span>
                  ) : (
                    <span className="text-rose-400">❌ Missed</span>
                  )
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </span>
            </div>
          </div>

          {/* Section 4: Mood Selection */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              How was your day?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {moods.map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setMood(m.type)}
                  className={`p-3 rounded-xl border text-left font-medium text-sm transition-all flex items-center gap-3 ${
                    mood === m.type
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span>{m.label.substring(3)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Optional Reason */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              What affected your productivity? (Optional)
            </h3>
            <div className="flex flex-wrap gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setOptionalReason(optionalReason === r ? '' : r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    optionalReason === r
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Finish Day'}
          </button>
        </div>
      </div>
    </div>
  );
};
