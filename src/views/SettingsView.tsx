import React, { useState, useEffect } from 'react';
import { UserConfig, DailyHabit } from '../../shared/types';
import { fetchGitStatus, syncGitRepo } from '../api';
import { Settings as SettingsIcon, User, Repeat, Save, Plus, Trash2, GitBranch, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsViewProps {
  users: UserConfig[];
  onSaveUsers: (users: UserConfig[]) => Promise<void>;
  habits: DailyHabit[];
  onSaveHabits: (habits: DailyHabit[]) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  users,
  onSaveUsers,
  habits,
  onSaveHabits,
}) => {
  const [localUsers, setLocalUsers] = useState<UserConfig[]>(users);
  const [localHabits, setLocalHabits] = useState<DailyHabit[]>(habits);
  const [newHabitName, setNewHabitName] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  const [gitStatus, setGitStatus] = useState<{
    isGitRepo: boolean;
    branch?: string;
    remoteUrl?: string;
    hasUncommittedChanges?: boolean;
    github?: {
      owner: string;
      repo: string;
      authenticated: boolean;
    };
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  useEffect(() => {
    setLocalHabits(habits);
  }, [habits]);

  useEffect(() => {
    fetchGitStatus().then(setGitStatus).catch(console.error);
  }, []);

  const handleUserChange = (index: number, key: keyof UserConfig, value: string) => {
    const updated = [...localUsers];
    updated[index] = { ...updated[index], [key]: value };
    setLocalUsers(updated);
  };

  const addHabitForUser = (userId: string) => {
    const name = newHabitName[userId]?.trim();
    if (!name) return;

    const newHabit: DailyHabit = {
      id: `habit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      owner: userId,
      frequency: 'daily',
    };

    setLocalHabits([...localHabits, newHabit]);
    setNewHabitName((prev) => ({ ...prev, [userId]: '' }));
  };

  const removeHabit = (id: string) => {
    setLocalHabits(localHabits.filter((h) => h.id !== id));
  };

  const handleSaveAll = async () => {
    await onSaveUsers(localUsers);
    await onSaveHabits(localHabits);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSyncGit = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncGitRepo();
      setSyncMessage(res.message);
      const updatedStatus = await fetchGitStatus();
      setGitStatus(updatedStatus);
    } catch (err) {
      setSyncMessage(`Sync error: ${(err as Error).message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-indigo-400" />
            Settings & Git Repository Integration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure independent user profiles, standard Git repo syncing, and personal habits.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Save className="w-4 h-4" />
          {isSaved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* Git Repository Sync Configuration */}
      <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              Git Repository Sync (<code className="text-indigo-300">git pull --rebase</code> & <code className="text-indigo-300">git push</code>)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sync tasks, commitments, check-ins, and habits automatically using native <code className="text-indigo-300">git</code> commands.
            </p>
          </div>

          <button
            onClick={handleSyncGit}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-semibold text-xs transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Git Repo'}
          </button>
        </div>

        {syncMessage && (
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>{syncMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl glass-card space-y-1">
            <span className="text-slate-400 font-semibold block uppercase">Git Branch</span>
            <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {gitStatus?.branch || 'main'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl glass-card space-y-1">
            <span className="text-slate-400 font-semibold block uppercase">Remote Origin</span>
            <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5 truncate">
              {gitStatus?.remoteUrl ? (
                <span className="text-indigo-400 font-mono text-xs truncate">{gitStatus.remoteUrl}</span>
              ) : (
                <span className="text-slate-400 font-medium">Local Repository</span>
              )}
            </span>
          </div>

          <div className="p-3.5 rounded-xl glass-card space-y-1">
            <span className="text-slate-400 font-semibold block uppercase">GitHub Issue API Token</span>
            <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${gitStatus?.github?.authenticated ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {gitStatus?.github?.authenticated ? (
                <span className="text-emerald-400 font-semibold">Active (.env)</span>
              ) : (
                <span className="text-amber-400 font-medium">Not configured</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* User Profiles Configuration */}
      <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" />
          User Profiles (Two Friends)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localUsers.map((u, idx) => (
            <div key={u.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-indigo-400">
                  User {idx + 1} (ID: {u.id})
                </span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={u.name}
                  onChange={(e) => handleUserChange(idx, 'name', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">GitHub Username</label>
                <input
                  type="text"
                  value={u.githubUsername}
                  onChange={(e) => handleUserChange(idx, 'githubUsername', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Independent Daily Habits Configuration Per User */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-indigo-400" />
            Independent Daily Habits Per User
          </h2>
          <span className="text-xs text-slate-400">Each friend has their own custom habit list</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {localUsers.map((u) => {
            const userHabits = localHabits.filter((h) => h.owner === u.id);

            return (
              <div key={u.id} className="glass-panel rounded-2xl p-5 border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <h3 className="font-bold text-slate-100">{u.name}'s Daily Habits</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                    {userHabits.length} habits
                  </span>
                </div>

                {/* Add Habit Input for this user */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Add habit for ${u.name}...`}
                    value={newHabitName[u.id] || ''}
                    onChange={(e) =>
                      setNewHabitName((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addHabitForUser(u.id);
                      }
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => addHabitForUser(u.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>

                {/* Habit List for this user */}
                {userHabits.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 text-center rounded-xl bg-slate-950/40">
                    No habits configured for {u.name}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userHabits.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-3 rounded-xl glass-card text-sm"
                      >
                        <span className="font-medium text-slate-200">{h.name}</span>
                        <button
                          onClick={() => removeHabit(h.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete habit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
