import React, { useState } from 'react';
import { Task, UserConfig } from '../../shared/types';
import { TaskCard } from '../components/TaskCard';
import { classifyDate, getShortcutDate } from '../../shared/dateUtils';
import { Layers, Plus, Calendar, Edit2, Check } from 'lucide-react';

interface BacklogViewProps {
  tasks: Task[];
  activeUser: UserConfig;
  onToggleTaskComplete: (task: Task) => void;
  onMoveTask: (task: Task, shortcut: string) => void;
  onDropTask: (task: Task) => void;
  onUpdateTitle: (task: Task, newTitle: string) => void;
  onOpenAddTask: () => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  tasks,
  activeUser,
  onToggleTaskComplete,
  onMoveTask,
  onDropTask,
  onUpdateTitle,
  onOpenAddTask,
}) => {
  const userTasks = tasks.filter((t) => t.owner === activeUser.id);

  const groups = {
    TODAY: userTasks.filter((t) => classifyDate(t.currentDueDate) === 'TODAY' || classifyDate(t.currentDueDate) === 'OVERDUE'),
    THIS_WEEK: userTasks.filter((t) => classifyDate(t.currentDueDate) === 'THIS_WEEK'),
    THIS_MONTH: userTasks.filter((t) => classifyDate(t.currentDueDate) === 'THIS_MONTH'),
    LATER: userTasks.filter((t) => classifyDate(t.currentDueDate) === 'LATER'),
  };

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitleText(task.title);
  };

  const saveEdit = (task: Task) => {
    if (editTitleText.trim()) {
      onUpdateTitle(task, editTitleText.trim());
    }
    setEditingTaskId(null);
  };

  const renderTaskRow = (task: Task) => {
    const isEditing = editingTaskId === task.id;

    if (isEditing) {
      return (
        <div key={task.id} className="glass-card rounded-xl p-3 flex items-center gap-2">
          <input
            type="text"
            value={editTitleText}
            onChange={(e) => setEditTitleText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            onClick={() => saveEdit(task)}
            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div key={task.id} className="relative group">
        <TaskCard
          task={task}
          onToggleComplete={onToggleTaskComplete}
          onMoveTask={onMoveTask}
          onDropTask={onDropTask}
        />
        <button
          onClick={() => startEdit(task)}
          className="absolute right-24 top-4 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity"
          title="Edit title"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Lightweight Backlog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organized planning view for {activeUser.name}'s tasks across timeframes.
          </p>
        </div>
        <button
          onClick={onOpenAddTask}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      <div className="space-y-6">
        {/* Today */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Today ({groups.TODAY.length})
          </h2>
          {groups.TODAY.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 rounded-xl glass-card">No tasks scheduled for Today.</p>
          ) : (
            <div className="space-y-2">{groups.TODAY.map(renderTaskRow)}</div>
          )}
        </div>

        {/* This Week */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            This Week ({groups.THIS_WEEK.length})
          </h2>
          {groups.THIS_WEEK.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 rounded-xl glass-card">No tasks for This Week.</p>
          ) : (
            <div className="space-y-2">{groups.THIS_WEEK.map(renderTaskRow)}</div>
          )}
        </div>

        {/* This Month */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            This Month ({groups.THIS_MONTH.length})
          </h2>
          {groups.THIS_MONTH.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 rounded-xl glass-card">No tasks for This Month.</p>
          ) : (
            <div className="space-y-2">{groups.THIS_MONTH.map(renderTaskRow)}</div>
          )}
        </div>

        {/* Later */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Later ({groups.LATER.length})
          </h2>
          {groups.LATER.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 rounded-xl glass-card">No future backlog tasks.</p>
          ) : (
            <div className="space-y-2">{groups.LATER.map(renderTaskRow)}</div>
          )}
        </div>
      </div>
    </div>
  );
};
