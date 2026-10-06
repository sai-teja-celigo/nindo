import React, { useState, useEffect } from 'react';
import { UserMetrics } from '../../shared/types';
import { fetchLeaderboard } from '../api';
import { Trophy, Smile, Flame, Shield, CheckCircle2, AlertTriangle, Star } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const [metrics, setMetrics] = useState<UserMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchLeaderboard(timeframe)
      .then((data) => {
        if (isMounted) {
          setMetrics(data.metrics);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load leaderboard', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timeframe]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading Leaderboard stats...
      </div>
    );
  }

  const user1 = metrics[0];
  const user2 = metrics[1];

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Friend Accountability Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare progress transparently without opaque single-score gamification.
          </p>
        </div>

        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['week', 'month', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                timeframe === tf
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf === 'week' ? 'This Week' : tf === 'month' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Comparison Table Card */}
      <div className="glass-panel rounded-2xl p-6 border-slate-800 shadow-xl overflow-hidden">
        <div className="grid grid-cols-3 pb-4 border-b border-slate-800 font-bold text-sm text-slate-300">
          <div>METRIC</div>
          <div className="text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            {user1?.user.name || 'User 1'}
          </div>
          <div className="text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500"></span>
            {user2?.user.name || 'User 2'}
          </div>
        </div>

        <div className="divide-y divide-slate-800/60 text-sm">
          {/* Row 1: Tasks Completion % */}
          <div className="grid grid-cols-3 py-3.5 items-center">
            <span className="font-semibold text-slate-200">Tasks</span>
            <div className="text-center font-bold text-slate-100 text-base">
              {user1 ? `${user1.commitmentCompletionPct}%` : '0%'}
            </div>
            <div className="text-center font-bold text-slate-100 text-base">
              {user2 ? `${user2.commitmentCompletionPct}%` : '0%'}
            </div>
          </div>

          {/* Row 2: Daily Habits % */}
          <div className="grid grid-cols-3 py-3.5 items-center">
            <span className="font-semibold text-slate-200">Daily Habits</span>
            <div className="text-center font-bold text-slate-100 text-base">
              {user1 ? `${user1.habitCompletionPct}%` : '0%'}
            </div>
            <div className="text-center font-bold text-slate-100 text-base">
              {user2 ? `${user2.habitCompletionPct}%` : '0%'}
            </div>
          </div>

          {/* Row 3: Happy Days */}
          <div className="grid grid-cols-3 py-3.5 items-center">
            <span className="font-semibold text-slate-200">Happy Days</span>
            <div className="text-center text-slate-200">
              {user1 ? `${user1.happyDaysCount} / ${user1.totalCheckInsCount}` : '0 / 0'}
            </div>
            <div className="text-center text-slate-200">
              {user2 ? `${user2.happyDaysCount} / ${user2.totalCheckInsCount}` : '0 / 0'}
            </div>
          </div>

          {/* Row 4: Must Wins */}
          <div className="grid grid-cols-3 py-3.5 items-center">
            <span className="font-semibold text-slate-200">Must Wins</span>
            <div className="text-center text-slate-200">
              {user1 ? `${user1.mustWinsCompleted} / ${user1.mustWinsTotal}` : '0 / 0'}
            </div>
            <div className="text-center text-slate-200">
              {user2 ? `${user2.mustWinsCompleted} / ${user2.mustWinsTotal}` : '0 / 0'}
            </div>
          </div>

          {/* Row 5: Rollovers */}
          <div className="grid grid-cols-3 py-3.5 items-center">
            <span className="font-semibold text-slate-200">Rollovers</span>
            <div className="text-center text-amber-400 font-semibold">
              {user1 ? user1.rolloversCount : 0}
            </div>
            <div className="text-center text-amber-400 font-semibold">
              {user2 ? user2.rolloversCount : 0}
            </div>
          </div>

          {/* Row 6: Perfect Days */}
          <div className="grid grid-cols-3 py-3.5 items-center">
            <span className="font-semibold text-slate-200">Perfect Days</span>
            <div className="text-center text-emerald-400 font-bold">
              {user1 ? user1.perfectDaysCount : 0}
            </div>
            <div className="text-center text-emerald-400 font-bold">
              {user2 ? user2.perfectDaysCount : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Happiness & Mood Distribution Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Smile className="w-5 h-5 text-indigo-400" />
          Mood Distribution & Reflection
        </h2>
        <p className="text-xs text-slate-400">
          Mood is recorded for personal reflection, not competitive scoring.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[user1, user2].map((u, idx) => {
            if (!u) return null;
            return (
              <div key={u.user.id} className="glass-card rounded-2xl p-5 border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="font-bold text-slate-200">{u.user.name}</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {u.positiveDaysCount} / {u.totalCheckInsCount} positive days
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>😄 Happy</span>
                    <span className="font-bold text-slate-200">{u.moodCounts.HAPPY} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>🙂 Not as productive</span>
                    <span className="font-bold text-slate-200">{u.moodCounts.NOT_AS_PRODUCTIVE} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>😕 Bad</span>
                    <span className="font-bold text-slate-200">{u.moodCounts.BAD} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>😫 Worse</span>
                    <span className="font-bold text-slate-200">{u.moodCounts.WORSE} days</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
