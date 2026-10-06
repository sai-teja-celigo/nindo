import { 
  Task, 
  DailyHabit, 
  DailyCommitment, 
  DailyCheckIn, 
  UserConfig, 
  UserMetrics,
  MoodType,
  ProductivityReason
} from '../shared/types';

const API_BASE = '/api';

export async function fetchUsers(): Promise<UserConfig[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function saveUsers(users: UserConfig[]): Promise<void> {
  await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users),
  });
}

export async function fetchHabits(): Promise<DailyHabit[]> {
  const res = await fetch(`${API_BASE}/habits`);
  if (!res.ok) throw new Error('Failed to fetch habits');
  return res.json();
}

export async function saveHabits(habits: DailyHabit[]): Promise<void> {
  await fetch(`${API_BASE}/habits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(habits),
  });
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(payload: {
  title: string;
  owner: string;
  dueDateShortcut?: string;
  customDueDate?: string;
}): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create task');
  const data = await res.json();
  return data.task;
}

export async function updateTask(id: string, updates: {
  status?: 'OPEN' | 'COMPLETED' | 'DROPPED';
  currentDueDate?: string;
  title?: string;
}): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update task');
  const data = await res.json();
  return data.task;
}

export async function fetchCommitment(user: string, date: string): Promise<DailyCommitment | null> {
  const res = await fetch(`${API_BASE}/commitments/${user}/${date}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveCommitment(payload: {
  date: string;
  user: string;
  committedTaskIds: string[];
  mustWinTaskId?: string;
}): Promise<DailyCommitment> {
  const res = await fetch(`${API_BASE}/commitments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save commitment');
  const data = await res.json();
  return data.commitment;
}

export async function fetchCheckIn(user: string, date: string): Promise<DailyCheckIn | null> {
  const res = await fetch(`${API_BASE}/checkins/${user}/${date}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveCheckIn(payload: {
  date: string;
  user: string;
  committedTasks: string[];
  completedTasks: string[];
  completedHabits: string[];
  totalHabits: number;
  mustWinCompleted?: boolean;
  mood: MoodType;
  optionalReason?: ProductivityReason | string;
}): Promise<DailyCheckIn> {
  const res = await fetch(`${API_BASE}/checkins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save check-in');
  const data = await res.json();
  return data.checkin;
}

export async function fetchLeaderboard(timeframe: 'week' | 'month' | 'all' = 'week'): Promise<{
  timeframe: string;
  metrics: UserMetrics[];
}> {
  const res = await fetch(`${API_BASE}/leaderboard?timeframe=${timeframe}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export async function fetchWeeklyReview(user: string): Promise<any> {
  const res = await fetch(`${API_BASE}/review/weekly?user=${user}`);
  if (!res.ok) throw new Error('Failed to fetch weekly review');
  return res.json();
}

export async function fetchGitStatus(): Promise<{
  isGitRepo: boolean;
  branch?: string;
  remoteUrl?: string;
  hasUncommittedChanges?: boolean;
  github?: {
    owner: string;
    repo: string;
    authenticated: boolean;
  };
}> {
  const res = await fetch(`${API_BASE}/git/status`);
  if (!res.ok) return { isGitRepo: false };
  return res.json();
}

export async function syncGitRepo(message?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/git/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Failed to perform Git sync');
  return res.json();
}
