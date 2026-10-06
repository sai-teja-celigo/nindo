import React from 'react';
import { Task } from '../../shared/types';
import { Check, Calendar, ArrowRight, GitPullRequest, Star, MoreHorizontal, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onMoveTask?: (task: Task, newDateShortcut: string) => void;
  onDropTask?: (task: Task) => void;
  isMustWin?: boolean;
  isCommitted?: boolean;
  compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onMoveTask,
  onDropTask,
  isMustWin = false,
  isCommitted = false,
  compact = false,
}) => {
  const isCompleted = task.status === 'COMPLETED';
  const isDropped = task.status === 'DROPPED';

  // Rollover styling
  let rolloverBadge = null;
  if (task.rolloverCount > 0) {
    const isHigh = task.rolloverCount >= 3;
    rolloverBadge = (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium ${
          isHigh
            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
        }`}
        title={`Originally due ${task.originalDueDate}`}
      >
        <ArrowRight className="w-3 h-3" />
        Rolled over {task.rolloverCount}x
      </span>
    );
  }

  return (
    <div
      className={`group glass-card rounded-xl p-3.5 flex items-center justify-between gap-3 ${
        isCompleted ? 'opacity-65 bg-slate-900/40' : ''
      } ${isMustWin ? 'ring-1 ring-amber-500/50 bg-amber-500/5' : ''}`}
    >
      {/* Left: Checkbox + Info */}
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => onToggleComplete(task)}
          className={`checkbox-custom mt-0.5 sm:mt-0 ${isCompleted ? 'checked' : ''}`}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isMustWin && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Star className="w-3 h-3 fill-amber-300" />
                MUST WIN
              </span>
            )}

            <span
              className={`text-sm font-medium transition-all break-words ${
                isCompleted
                  ? 'line-through text-slate-400'
                  : isDropped
                  ? 'line-through text-rose-400'
                  : 'text-slate-100'
              }`}
            >
              {task.title}
            </span>

            {task.createdDuringDay && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                Added today
              </span>
            )}
          </div>

          {!compact && (
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Calendar className="w-3 h-3" />
                {task.currentDueDate}
              </span>

              {task.originalDueDate !== task.currentDueDate && (
                <span className="text-slate-500">
                  (Orig: {task.originalDueDate})
                </span>
              )}

              {rolloverBadge}

              {task.githubIssueNumber && (
                <a
                  href={task.githubIssueUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:underline ml-1"
                >
                  <GitPullRequest className="w-3 h-3" />
                  #{task.githubIssueNumber}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick actions (Move/Drop) */}
      {!isCompleted && !compact && onMoveTask && (
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={() => onMoveTask(task, 'tomorrow')}
            className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Move to Tomorrow"
          >
            Tomorrow
          </button>
          <button
            onClick={() => onMoveTask(task, 'weekend')}
            className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Move to Weekend"
          >
            Weekend
          </button>
          {onDropTask && (
            <button
              onClick={() => onDropTask(task)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
              title="Drop task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
