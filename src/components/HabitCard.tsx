import React from 'react';
import { DailyHabit } from '../../shared/types';
import { Check, Repeat } from 'lucide-react';

interface HabitCardProps {
  habit: DailyHabit;
  isCompleted: boolean;
  onToggle: (habitId: string) => void;
  disabled?: boolean;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  isCompleted,
  onToggle,
  disabled = false,
}) => {
  return (
    <div
      onClick={() => !disabled && onToggle(habit.id)}
      className={`group glass-card rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer select-none ${
        isCompleted ? 'bg-indigo-950/20 border-indigo-500/30' : ''
      } ${disabled ? 'opacity-60 cursor-default' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`checkbox-custom ${isCompleted ? 'checked' : ''}`}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
        <div>
          <span
            className={`text-sm font-medium ${
              isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
            }`}
          >
            {habit.name}
          </span>
        </div>
      </div>

      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
        Daily
      </span>
    </div>
  );
};
