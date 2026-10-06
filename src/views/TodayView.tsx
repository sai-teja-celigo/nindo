import React, { useState } from 'react';
import { Task, DailyHabit, DailyCommitment, DailyCheckIn, UserConfig } from '../../shared/types';
import { TaskCard } from '../components/TaskCard';
import { HabitCard } from '../components/HabitCard';
import { classifyDate, getToday } from '../../shared/dateUtils';
import { Play, CheckCircle2, ShieldCheck, Flame, Star, AlertCircle, Plus, Calendar } from 'lucide-react';

interface TodayViewProps {
  tasks: Task[];
  habits: DailyHabit[];
  commitment: DailyCommitment | null;
  checkIn: DailyCheckIn | null;
  activeUser: UserConfig;
  onToggleTaskComplete: (task: Task) => void;
  onMoveTask: (task: Task, shortcut: string) => void;
  onDropTask: (task: Task) => void;
  onOpenStartDay: () => void;
  onOpenEndDay: () => void;
  onOpenAddTask: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  habits,
  commitment,
  checkIn,
  activeUser,
  onToggleTaskComplete,
  onMoveTask,
  onDropTask,
  onOpenStartDay,
  onOpenEndDay,
  onOpenAddTask,
}) => {
  const todayStr = getToday();
  const userTasks = tasks.filter((t) => t.owner === activeUser.id);
  const userHabits = habits.filter((h) => h.owner === activeUser.id);

  // Group tasks
  const overdueTasks = userTasks.filter(
    (t) => t.status === 'OPEN' && classifyDate(t.currentDueDate) === 'OVERDUE'
  );

  const todayTasks = userTasks.filter((t) => classifyDate(t.currentDueDate) === 'TODAY');

  const thisWeekTasks = userTasks.filter(
    (t) => classifyDate(t.currentDueDate) === 'THIS_WEEK'
  );

  const thisMonthTasks = userTasks.filter(
    (t) => classifyDate(t.currentDueDate) === 'THIS_MONTH'
  );

  // Local habit completion check (persisted when End Day is submitted)
  const [completedHabits, setCompletedHabits] = useState<string[]>(
    checkIn ? checkIn.completedHabits : []
  );

  const toggleHabit = (habitId: string) => {
    if (checkIn) return; // closed
    if (completedHabits.includes(habitId)) {
      setCompletedHabits(completedHabits.filter((id) => id !== habitId));
    } else {
      setCompletedHabits([...completedHabits, habitId]);
    }
  };

  const isDayStarted = !!commitment;
  const isDayClosed = commitment?.status === 'CLOSED' || !!checkIn;

  // Calculate completion for today
  const committedTaskObjects = userTasks.filter((t) =>
    commitment?.committedTaskIds.includes(t.id)
  );
  const completedCommittedCount = committedTaskObjects.filter(
    (t) => t.status === 'COMPLETED'
  ).length;

  const totalCommittedCount = commitment
    ? commitment.committedTaskIds.length
    : todayTasks.length;

  const completionPct =
    totalCommittedCount > 0
      ? Math.round((completedCommittedCount / totalCommittedCount) * 100)
      : 0;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Top Banner / Lifecycle Action */}
      {!isDayStarted ? (
        <div className="glass-panel p-6 rounded-2xl border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
              <Flame className="w-4 h-4 fill-indigo-400" />
              <span>Morning Ritual</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Ready to conquer today, {activeUser.name}?</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Lock in your morning commitment snapshot to start tracking accountability.
            </p>
          </div>
          <button
            onClick={onOpenStartDay}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all flex-shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            Start My Day
          </button>
        </div>
      ) : isDayClosed ? (
        <div className="glass-panel p-6 rounded-2xl border-emerald-500/30 bg-emerald-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Day Completed & Locked</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Great job today! Mood: {checkIn?.mood ? checkIn.mood.replace('_', ' ') : 'CLOSED'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Score: {completionPct}% committed tasks ({completedCommittedCount}/{totalCommittedCount})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-emerald-400">{completionPct}%</span>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-5 rounded-2xl border-indigo-500/30 bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
              {completionPct}%
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <ShieldCheck className="w-4 h-4" /> Day Active • {completedCommittedCount} / {totalCommittedCount} Committed Tasks Completed
              </div>
              <h2 className="text-lg font-bold text-slate-100">Keep up the focus!</h2>
            </div>
          </div>
          <button
            onClick={onOpenEndDay}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 transition-all flex-shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            End Day & Review
          </button>
        </div>
      )}

      {/* OVERDUE SECTION (If any) */}
      {overdueTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
            <AlertCircle className="w-4 h-4" />
            <span>OVERDUE ({overdueTasks.length})</span>
          </div>
          <div className="space-y-2">
            {overdueTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleComplete={onToggleTaskComplete}
                onMoveTask={onMoveTask}
                onDropTask={onDropTask}
              />
            ))}
          </div>
        </div>
      )}

      {/* TODAY SECTION (Primary Focus) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            TODAY ({todayTasks.length})
          </h2>
          <button
            onClick={onOpenAddTask}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Add
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel text-center text-slate-400">
            <p className="text-sm font-medium">No tasks scheduled for today!</p>
            <button
              onClick={onOpenAddTask}
              className="mt-3 text-xs text-indigo-400 hover:underline"
            >
              + Add a task for Today
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleComplete={onToggleTaskComplete}
                onMoveTask={onMoveTask}
                onDropTask={onDropTask}
                isMustWin={commitment?.mustWinTaskId === t.id}
                isCommitted={commitment?.committedTaskIds.includes(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* DAILY HABITS SECTION */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500"></span>
          DAILY HABITS
        </h2>

        {userHabits.length === 0 ? (
          <div className="p-4 rounded-xl glass-card text-center text-slate-400 text-xs">
            No habits configured yet. You can add daily habits in Settings.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {userHabits.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                isCompleted={completedHabits.includes(h.id)}
                onToggle={toggleHabit}
                disabled={isDayClosed}
              />
            ))}
          </div>
        )}
      </div>

      {/* THIS WEEK (Visually Secondary) */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80 opacity-80">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          THIS WEEK ({thisWeekTasks.length})
        </h2>
        {thisWeekTasks.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No additional tasks for this week.</p>
        ) : (
          <div className="space-y-2">
            {thisWeekTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleComplete={onToggleTaskComplete}
                onMoveTask={onMoveTask}
                onDropTask={onDropTask}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* THIS MONTH (Visually Secondary) */}
      <div className="space-y-3 opacity-60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          THIS MONTH ({thisMonthTasks.length})
        </h2>
        {thisMonthTasks.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No additional tasks for this month.</p>
        ) : (
          <div className="space-y-2">
            {thisMonthTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleComplete={onToggleTaskComplete}
                onMoveTask={onMoveTask}
                onDropTask={onDropTask}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
