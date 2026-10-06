import React, { useState, useEffect, useCallback } from 'react';
import { Task, DailyHabit, DailyCommitment, DailyCheckIn, UserConfig } from '../shared/types';
import { getToday, getShortcutDate } from '../shared/dateUtils';
import { 
  fetchUsers, 
  saveUsers, 
  fetchHabits, 
  saveHabits, 
  fetchTasks, 
  createTask, 
  updateTask, 
  fetchCommitment, 
  saveCommitment, 
  fetchCheckIn, 
  saveCheckIn 
} from './api';
import { Navbar } from './components/Navbar';
import { AddTaskModal } from './components/AddTaskModal';
import { TodayView } from './views/TodayView';
import { StartDayModal } from './views/StartDayModal';
import { EndDayModal } from './views/EndDayModal';
import { BacklogView } from './views/BacklogView';
import { LeaderboardView } from './views/LeaderboardView';
import { WeeklyReviewView } from './views/WeeklyReviewView';
import { SettingsView } from './views/SettingsView';

export function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'backlog' | 'review' | 'leaderboard' | 'settings'>('today');
  const [users, setUsers] = useState<UserConfig[]>([]);
  const [activeUserId, setActiveUserId] = useState<string>('soit');
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commitment, setCommitment] = useState<DailyCommitment | null>(null);
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isStartDayOpen, setIsStartDayOpen] = useState(false);
  const [isEndDayOpen, setIsEndDayOpen] = useState(false);

  const todayStr = getToday();

  const loadData = useCallback(async () => {
    try {
      const loadedUsers = await fetchUsers();
      setUsers(loadedUsers);
      const uid = activeUserId || (loadedUsers[0] ? loadedUsers[0].id : 'soit');
      if (!activeUserId && loadedUsers[0]) setActiveUserId(loadedUsers[0].id);

      const [loadedHabits, loadedTasks, loadedCommitment, loadedCheckIn] = await Promise.all([
        fetchHabits(),
        fetchTasks(),
        fetchCommitment(uid, todayStr),
        fetchCheckIn(uid, todayStr),
      ]);

      setHabits(loadedHabits);
      setTasks(loadedTasks);
      setCommitment(loadedCommitment);
      setCheckIn(loadedCheckIn);
    } catch (err) {
      console.error('Error loading Nindo data', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId, todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleToggleTaskComplete = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'OPEN' : 'COMPLETED';
    const updated = await updateTask(task.id, { status: newStatus });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  const handleMoveTask = async (task: Task, shortcut: string) => {
    const newDate = getShortcutDate(shortcut);
    const updated = await updateTask(task.id, { currentDueDate: newDate });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  const handleDropTask = async (task: Task) => {
    const updated = await updateTask(task.id, { status: 'DROPPED' });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  const handleUpdateTitle = async (task: Task, newTitle: string) => {
    const updated = await updateTask(task.id, { title: newTitle });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  const handleAddTask = async (taskData: {
    title: string;
    owner: string;
    dueDateShortcut: string;
    customDueDate?: string;
  }) => {
    const newTask = await createTask(taskData);
    setTasks((prev) => [...prev, newTask]);
  };

  const handleConfirmStartDay = async (committedTaskIds: string[], mustWinTaskId?: string) => {
    const newCommitment = await saveCommitment({
      date: todayStr,
      user: activeUserId,
      committedTaskIds,
      mustWinTaskId,
    });
    setCommitment(newCommitment);
  };

  const handleFinishDay = async (payload: {
    completedTasks: string[];
    completedHabits: string[];
    mustWinCompleted?: boolean;
    mood: any;
    optionalReason?: string;
    rollovers: { taskId: string; newDateShortcut: string }[];
    droppedTaskIds: string[];
  }) => {
    // 1. Process task rollovers & dropped tasks
    for (const roll of payload.rollovers) {
      const task = tasks.find((t) => t.id === roll.taskId);
      if (task) {
        const newDate = getShortcutDate(roll.newDateShortcut);
        await updateTask(task.id, { currentDueDate: newDate });
      }
    }

    for (const dropId of payload.droppedTaskIds) {
      await updateTask(dropId, { status: 'DROPPED' });
    }

    // 2. Refresh tasks after modifications
    const updatedTasks = await fetchTasks();
    setTasks(updatedTasks);

    // 3. Save EOD check-in
    const committedIds = commitment ? commitment.committedTaskIds : [];
    const newCheckIn = await saveCheckIn({
      date: todayStr,
      user: activeUserId,
      committedTasks: committedIds,
      completedTasks: payload.completedTasks,
      completedHabits: payload.completedHabits,
      totalHabits: habits.filter((h) => h.owner === activeUserId).length,
      mustWinCompleted: payload.mustWinCompleted,
      mood: payload.mood,
      optionalReason: payload.optionalReason,
    });

    setCheckIn(newCheckIn);
    if (commitment) {
      setCommitment({ ...commitment, status: 'CLOSED' });
    }
  };

  const activeUser = users.find((u) => u.id === activeUserId) || {
    id: 'soit',
    name: 'Soit',
    githubUsername: 'soit',
    weekStart: 'monday',
    timezone: 'UTC',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-pulse text-lg font-medium">Initializing Nindo...</div>
      </div>
    );
  }

  // Today Tasks for Start Day
  const todayUserTasks = tasks.filter(
    (t) => t.owner === activeUserId && t.currentDueDate === todayStr
  );

  // Committed Tasks for End Day
  const committedUserTasks = commitment
    ? tasks.filter((t) => commitment.committedTaskIds.includes(t.id))
    : todayUserTasks;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        users={users}
        activeUserId={activeUserId}
        setActiveUserId={setActiveUserId}
        onOpenAddTask={() => setIsAddTaskOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {activeTab === 'today' && (
          <TodayView
            tasks={tasks}
            habits={habits}
            commitment={commitment}
            checkIn={checkIn}
            activeUser={activeUser}
            onToggleTaskComplete={handleToggleTaskComplete}
            onMoveTask={handleMoveTask}
            onDropTask={handleDropTask}
            onOpenStartDay={() => setIsStartDayOpen(true)}
            onOpenEndDay={() => setIsEndDayOpen(true)}
            onOpenAddTask={() => setIsAddTaskOpen(true)}
          />
        )}

        {activeTab === 'backlog' && (
          <BacklogView
            tasks={tasks}
            activeUser={activeUser}
            onToggleTaskComplete={handleToggleTaskComplete}
            onMoveTask={handleMoveTask}
            onDropTask={handleDropTask}
            onUpdateTitle={handleUpdateTitle}
            onOpenAddTask={() => setIsAddTaskOpen(true)}
          />
        )}

        {activeTab === 'review' && <WeeklyReviewView activeUser={activeUser} />}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'settings' && (
          <SettingsView
            users={users}
            onSaveUsers={async (updatedUsers) => {
              await saveUsers(updatedUsers);
              setUsers(updatedUsers);
            }}
            habits={habits}
            onSaveHabits={async (updatedHabits) => {
              await saveHabits(updatedHabits);
              setHabits(updatedHabits);
            }}
          />
        )}
      </main>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        users={users}
        activeUserId={activeUserId}
        onAddTask={handleAddTask}
      />

      <StartDayModal
        isOpen={isStartDayOpen}
        onClose={() => setIsStartDayOpen(false)}
        todayTasks={todayUserTasks}
        onConfirmStartDay={handleConfirmStartDay}
      />

      <EndDayModal
        isOpen={isEndDayOpen}
        onClose={() => setIsEndDayOpen(false)}
        committedTasks={committedUserTasks}
        habits={habits.filter((h) => h.owner === activeUserId)}
        mustWinTaskId={commitment?.mustWinTaskId}
        onFinishDay={handleFinishDay}
      />
    </div>
  );
}

export default App;
