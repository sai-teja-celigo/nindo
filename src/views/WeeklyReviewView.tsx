import React, { useState, useEffect } from 'react';
import { UserConfig } from '../../shared/types';
import { fetchWeeklyReview } from '../api';
import { BarChart3, Calendar, Award, AlertCircle, TrendingUp, Star, Flame } from 'lucide-react';

interface WeeklyReviewViewProps {
  activeUser: UserConfig;
}

export const WeeklyReviewView: React.FC<WeeklyReviewViewProps> = ({ activeUser }) => {
  const [review, setReview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchWeeklyReview(activeUser.id)
      .then((data) => {
        if (isMounted) {
          setReview(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load weekly review', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeUser.id]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading Weekly Review report...
      </div>
    );
  }

  if (!review) {
    return (
      <div className="p-8 text-center text-slate-400 glass-panel rounded-2xl">
        No review data recorded for this week yet.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Weekly Summary Report
          </span>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            {review.weekStart} – {review.weekEnd}
          </h1>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {/* Tasks Card */}
        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Tasks</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {review.taskCompletionPct}%
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {review.tasksCompleted} / {review.tasksCommitted} committed
          </p>
        </div>

        {/* Habits Card */}
        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Habits</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {review.habitCompletionPct}%
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {review.habitsCompleted} / {review.habitsScheduled} completed
          </p>
        </div>

        {/* Must Wins */}
        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Must Wins</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {review.mustWinsCompleted} / {review.mustWinsTotal}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">High stakes priority</p>
        </div>

        {/* Happy Days */}
        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Happy Days</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {review.happyDays} / {review.totalDaysRecorded}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Positive reflection</p>
        </div>

        {/* Rollovers */}
        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Rollovers</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {review.rolloversCount}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Moved tasks</p>
        </div>

        {/* Perfect Days */}
        <div className="glass-card rounded-2xl p-4">
          <span className="text-xs font-semibold uppercase text-slate-400">Perfect Days</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {review.perfectDays}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">100% completion</p>
        </div>
      </div>

      {/* Best / Lowest Day & Missed Habit Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 border-slate-800">
          <span className="text-xs font-semibold uppercase text-emerald-400 block mb-1">
            Best Day
          </span>
          <div className="text-lg font-bold text-slate-100">
            {review.bestDay ? `${review.bestDay.date} — ${review.bestDay.pct}%` : 'N/A'}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-slate-800">
          <span className="text-xs font-semibold uppercase text-rose-400 block mb-1">
            Lowest Day
          </span>
          <div className="text-lg font-bold text-slate-100">
            {review.lowestDay ? `${review.lowestDay.date} — ${review.lowestDay.pct}%` : 'N/A'}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-slate-800">
          <span className="text-xs font-semibold uppercase text-amber-400 block mb-1">
            Most Missed Habit
          </span>
          <div className="text-lg font-bold text-slate-100 truncate">
            {review.mostMissedHabit}
          </div>
        </div>
      </div>

      {/* Missed Tasks Reasons Breakdown */}
      <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Top Reasons for Missed Tasks
        </h2>

        {review.missedReasons.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No missed task reasons logged this week.</p>
        ) : (
          <div className="space-y-2">
            {review.missedReasons.map((item: any) => (
              <div
                key={item.reason}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm"
              >
                <span className="font-medium text-slate-200">{item.reason}</span>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30">
                  {item.count}x
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
