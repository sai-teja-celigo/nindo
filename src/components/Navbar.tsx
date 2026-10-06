import React, { useState } from 'react';
import { UserConfig } from '../../shared/types';
import { format } from 'date-fns';
import { 
  CheckSquare, 
  Layers, 
  BarChart3, 
  Trophy, 
  Settings as SettingsIcon, 
  Plus, 
  User as UserIcon,
  Flame,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'today' | 'backlog' | 'review' | 'leaderboard' | 'settings';
  setActiveTab: (tab: 'today' | 'backlog' | 'review' | 'leaderboard' | 'settings') => void;
  users: UserConfig[];
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  onOpenAddTask: () => void;
  onSync: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  users,
  activeUserId,
  setActiveUserId,
  onOpenAddTask,
  onSync,
}) => {
  const activeUser = users.find((u) => u.id === activeUserId) || users[0];
  const formattedDate = format(new Date(), 'EEEE, MMMM d');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { id: 'today', label: 'Today', icon: CheckSquare },
    { id: 'backlog', label: 'Backlog', icon: Layers },
    { id: 'review', label: 'Review', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Current Date */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('today')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Flame className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Nindo
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400">
                • {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Sync, Add Task & Active User Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-medium text-sm transition-all disabled:opacity-50"
            title="Sync Git Repository"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            onClick={onOpenAddTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>

          {/* User Switcher Dropdown */}
          <div className="relative flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <UserIcon className="w-4 h-4 text-indigo-400" />
            <select
              value={activeUserId}
              onChange={(e) => setActiveUserId(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
