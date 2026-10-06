import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  Task, 
  DailyHabit, 
  DailyCommitment, 
  DailyCheckIn, 
  UserConfig, 
  UserMetrics, 
  MoodType,
  ProductivityReason
} from '../shared/types.js';
import { getToday, getShortcutDate, getWeekStart, getWeekEnd, getMonthEnd, addDays } from '../shared/dateUtils.js';
import { getGitStatus, performGitSync } from './gitSync.js';
import { syncGitHubIssues, getGitHubRepoInfo } from './githubSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });

const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');
const HABITS_FILE = path.join(CONFIG_DIR, 'habits.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const COMMITMENTS_DIR = path.join(DATA_DIR, 'commitments');
const CHECKINS_DIR = path.join(DATA_DIR, 'checkins');

// Ensure directories exist
[CONFIG_DIR, DATA_DIR, COMMITMENTS_DIR, CHECKINS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper file I/O
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
app.use(cors());
app.use(express.json());

// Users API
app.get('/api/users', (req, res) => {
  const users = readJsonFile<UserConfig[]>(USERS_FILE, []);
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const users = req.body;
  writeJsonFile(USERS_FILE, users);
  res.json({ success: true, users });
  performGitSync('config: update users').catch(() => {});
});

// Habits API
app.get('/api/habits', (req, res) => {
  const habits = readJsonFile<DailyHabit[]>(HABITS_FILE, []);
  res.json(habits);
});

app.post('/api/habits', async (req, res) => {
  const habits = req.body;
  writeJsonFile(HABITS_FILE, habits);
  res.json({ success: true, habits });
  performGitSync('config: update daily habits').catch(() => {});
});

// Tasks API
app.get('/api/tasks', async (req, res) => {
  await syncGitHubIssues().catch(err => console.warn('syncGitHubIssues failed:', err));
  const tasks = readJsonFile<Task[]>(TASKS_FILE, []);
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { title, owner, dueDateShortcut, customDueDate } = req.body;
  const today = getToday();
  const dueDate = customDueDate || (dueDateShortcut ? getShortcutDate(dueDateShortcut) : today);

  const tasks = readJsonFile<Task[]>(TASKS_FILE, []);
  
  // Check if commitment already exists for today for this user
  const userCommitmentPath = path.join(COMMITMENTS_DIR, owner, `${today}.json`);
  const hasStartedDay = fs.existsSync(userCommitmentPath);

  const newTask: Task = {
    id: Date.now().toString(),
    title: title.trim(),
    owner,
    createdAt: new Date().toISOString(),
    originalDueDate: dueDate,
    currentDueDate: dueDate,
    status: 'OPEN',
    rolloverCount: 0,
    createdDuringDay: hasStartedDay && dueDate === today,
  };

  tasks.push(newTask);
  writeJsonFile(TASKS_FILE, tasks);
  res.json({ success: true, task: newTask });

  // Auto Git Sync
  performGitSync(`task: create "${newTask.title}" for ${owner}`).catch(() => {});
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status, currentDueDate, title } = req.body;
  const tasks = readJsonFile<Task[]>(TASKS_FILE, []);
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = tasks[taskIndex];

  if (title !== undefined) {
    task.title = title;
  }

  if (status !== undefined) {
    task.status = status;
    if (status === 'COMPLETED') {
      task.completedAt = new Date().toISOString();
    } else if (status === 'OPEN') {
      task.completedAt = null;
    }
  }

  if (currentDueDate !== undefined && currentDueDate !== task.currentDueDate) {
    task.currentDueDate = currentDueDate;
    task.rolloverCount += 1;
  }

  tasks[taskIndex] = task;
  writeJsonFile(TASKS_FILE, tasks);

  res.json({ success: true, task });

  performGitSync(`task: update "${task.title}" status=${task.status}`).catch(() => {});
});

// Commitments (Start Day) API
app.get('/api/commitments/:user/:date', (req, res) => {
  const { user, date } = req.params;
  const filePath = path.join(COMMITMENTS_DIR, user, `${date}.json`);
  const commitment = readJsonFile<DailyCommitment | null>(filePath, null);
  res.json(commitment);
});

app.post('/api/commitments', async (req, res) => {
  const { date, user, committedTaskIds, mustWinTaskId } = req.body;
  const userDir = path.join(COMMITMENTS_DIR, user);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  
  const filePath = path.join(userDir, `${date}.json`);
  
  const existing = readJsonFile<DailyCommitment | null>(filePath, null);
  if (existing && existing.status === 'CLOSED') {
    return res.status(400).json({ error: 'Day is already closed.' });
  }

  const commitment: DailyCommitment = {
    date,
    user,
    startedAt: new Date().toISOString(),
    committedTaskIds,
    mustWinTaskId,
    status: 'ACTIVE'
  };

  writeJsonFile(filePath, commitment);
  res.json({ success: true, commitment });

  performGitSync(`commitment: start day for ${user} on ${date}`).catch(() => {});
});

// Check-ins (End Day) API
app.get('/api/checkins/:user/:date', (req, res) => {
  const { user, date } = req.params;
  const filePath = path.join(CHECKINS_DIR, user, `${date}.json`);
  const checkin = readJsonFile<DailyCheckIn | null>(filePath, null);
  res.json(checkin);
});

app.post('/api/checkins', async (req, res) => {
  const { 
    date, 
    user, 
    committedTasks, 
    completedTasks, 
    completedHabits, 
    totalHabits, 
    mustWinCompleted, 
    mood, 
    optionalReason 
  } = req.body;

  const userDir = path.join(CHECKINS_DIR, user);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  const checkinPath = path.join(userDir, `${date}.json`);
  const checkin: DailyCheckIn = {
    date,
    user,
    committedTasks,
    completedTasks,
    completedHabits,
    totalHabits,
    mustWinCompleted,
    mood,
    optionalReason,
    finishedAt: new Date().toISOString()
  };

  writeJsonFile(checkinPath, checkin);

  // Lock commitment status to CLOSED
  const commitmentPath = path.join(COMMITMENTS_DIR, user, `${date}.json`);
  const commitment = readJsonFile<DailyCommitment | null>(commitmentPath, null);
  if (commitment) {
    commitment.status = 'CLOSED';
    writeJsonFile(commitmentPath, commitment);
  }

  res.json({ success: true, checkin });

  performGitSync(`checkin: finish day for ${user} on ${date} (Mood: ${mood})`).catch(() => {});
});

// Helper function to calculate user metrics
function calculateUserMetrics(user: UserConfig, timeframe: 'week' | 'month' | 'all' = 'week'): UserMetrics {
  const userDir = path.join(CHECKINS_DIR, user.id);
  const checkins: DailyCheckIn[] = [];
  
  const todayStr = getToday();
  const weekStart = getWeekStart();

  if (fs.existsSync(userDir)) {
    const files = fs.readdirSync(userDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const fileDate = file.replace('.json', '');
        if (timeframe === 'week' && fileDate < weekStart) return;
        const c = readJsonFile<DailyCheckIn>(path.join(userDir, file), null as any);
        if (c) checkins.push(c);
      }
    });
  }

  let totalCommitted = 0;
  let totalCommittedCompleted = 0;
  let totalTasksCompletedAll = 0;
  let totalHabitsScheduled = 0;
  let totalHabitsCompleted = 0;
  let mustWinsCompleted = 0;
  let mustWinsTotal = 0;
  let perfectDaysCount = 0;
  let positiveDaysCount = 0;

  const moodCounts: Record<MoodType, number> = {
    HAPPY: 0,
    NOT_AS_PRODUCTIVE: 0,
    BAD: 0,
    WORSE: 0
  };

  checkins.forEach(c => {
    moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
    if (c.mood === 'HAPPY' || c.mood === 'NOT_AS_PRODUCTIVE') {
      positiveDaysCount++;
    }

    const committedCount = c.committedTasks.length;
    const completedCommittedCount = c.completedTasks.filter(id => c.committedTasks.includes(id)).length;

    totalCommitted += committedCount;
    totalCommittedCompleted += completedCommittedCount;
    totalTasksCompletedAll += c.completedTasks.length;

    totalHabitsScheduled += c.totalHabits;
    totalHabitsCompleted += c.completedHabits.length;

    if (c.mustWinCompleted !== undefined) {
      mustWinsTotal++;
      if (c.mustWinCompleted) mustWinsCompleted++;
    }

    const habitPct = c.totalHabits > 0 ? (c.completedHabits.length / c.totalHabits) : 1;
    const taskPct = committedCount > 0 ? (completedCommittedCount / committedCount) : 1;
    const mustWinPassed = c.mustWinCompleted !== undefined ? c.mustWinCompleted : true;

    if (taskPct === 1 && habitPct === 1 && mustWinPassed) {
      perfectDaysCount++;
    }
  });

  const allTasks = readJsonFile<Task[]>(TASKS_FILE, []);
  const userTasks = allTasks.filter(t => t.owner === user.id);
  const rolloversCount = userTasks.reduce((acc, t) => acc + t.rolloverCount, 0);

  const commitmentCompletionPct = totalCommitted > 0 
    ? Math.round((totalCommittedCompleted / totalCommitted) * 100) 
    : 0;

  const habitCompletionPct = totalHabitsScheduled > 0 
    ? Math.round((totalHabitsCompleted / totalHabitsScheduled) * 100) 
    : 0;

  return {
    user,
    commitmentCompletionPct,
    totalTasksCompleted: totalTasksCompletedAll,
    habitCompletionPct,
    happyDaysCount: moodCounts.HAPPY,
    mustWinsCompleted,
    mustWinsTotal,
    rolloversCount,
    perfectDaysCount,
    moodCounts,
    positiveDaysCount,
    totalCheckInsCount: checkins.length
  };
}

// Leaderboard API
app.get('/api/leaderboard', (req, res) => {
  const users = readJsonFile<UserConfig[]>(USERS_FILE, []);
  const timeframe = (req.query.timeframe as any) || 'week';
  const metrics = users.map(user => calculateUserMetrics(user, timeframe));
  res.json({ timeframe, metrics });
});

// Weekly Review API
app.get('/api/review/weekly', (req, res) => {
  const users = readJsonFile<UserConfig[]>(USERS_FILE, []);
  const currentUserId = (req.query.user as string) || users[0]?.id || 'soit';
  const user = users.find(u => u.id === currentUserId) || users[0];

  const userDir = path.join(CHECKINS_DIR, currentUserId);
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  const checkins: DailyCheckIn[] = [];
  if (fs.existsSync(userDir)) {
    const files = fs.readdirSync(userDir);
    files.forEach(file => {
      const fileDate = file.replace('.json', '');
      if (fileDate >= weekStart && fileDate <= weekEnd) {
        const c = readJsonFile<DailyCheckIn>(path.join(userDir, file), null as any);
        if (c) checkins.push(c);
      }
    });
  }

  const habits = readJsonFile<DailyHabit[]>(HABITS_FILE, []).filter(h => h.owner === currentUserId);
  const habitMissCounts: Record<string, number> = {};
  habits.forEach(h => { habitMissCounts[h.name] = 0; });

  const missedReasonsCount: Record<string, number> = {};

  let totalCommitted = 0;
  let completedCommitted = 0;
  let totalHabitsScheduled = 0;
  let totalHabitsCompleted = 0;
  let mustWinsTotal = 0;
  let mustWinsCompleted = 0;
  let happyDays = 0;
  let perfectDays = 0;

  let bestDay: { date: string; pct: number } | null = null;
  let lowestDay: { date: string; pct: number } | null = null;

  checkins.forEach(c => {
    const committedCount = c.committedTasks.length;
    const completedCommittedCount = c.completedTasks.filter(id => c.committedTasks.includes(id)).length;
    totalCommitted += committedCount;
    completedCommitted += completedCommittedCount;

    const dayPct = committedCount > 0 ? (completedCommittedCount / committedCount) * 100 : 100;
    if (!bestDay || dayPct > bestDay.pct) bestDay = { date: c.date, pct: Math.round(dayPct) };
    if (!lowestDay || dayPct < lowestDay.pct) lowestDay = { date: c.date, pct: Math.round(dayPct) };

    totalHabitsScheduled += c.totalHabits;
    totalHabitsCompleted += c.completedHabits.length;

    habits.forEach(h => {
      if (!c.completedHabits.includes(h.id)) {
        habitMissCounts[h.name] = (habitMissCounts[h.name] || 0) + 1;
      }
    });

    if (c.mustWinCompleted !== undefined) {
      mustWinsTotal++;
      if (c.mustWinCompleted) mustWinsCompleted++;
    }

    if (c.mood === 'HAPPY') happyDays++;

    if (c.optionalReason) {
      missedReasonsCount[c.optionalReason] = (missedReasonsCount[c.optionalReason] || 0) + 1;
    }

    const habitPct = c.totalHabits > 0 ? (c.completedHabits.length / c.totalHabits) : 1;
    const taskPct = committedCount > 0 ? (completedCommittedCount / committedCount) : 1;
    const mustWinPassed = c.mustWinCompleted !== undefined ? c.mustWinCompleted : true;

    if (taskPct === 1 && habitPct === 1 && mustWinPassed) perfectDays++;
  });

  const allTasks = readJsonFile<Task[]>(TASKS_FILE, []);
  const rolloversCount = allTasks
    .filter(t => t.owner === currentUserId && t.currentDueDate >= weekStart && t.currentDueDate <= weekEnd)
    .reduce((acc, t) => acc + t.rolloverCount, 0);

  let mostMissedHabit = 'None';
  let maxMisses = 0;
  Object.entries(habitMissCounts).forEach(([name, misses]) => {
    if (misses > maxMisses) {
      maxMisses = misses;
      mostMissedHabit = name;
    }
  });

  res.json({
    user,
    weekStart,
    weekEnd,
    tasksCommitted: totalCommitted,
    tasksCompleted: completedCommitted,
    taskCompletionPct: totalCommitted > 0 ? Math.round((completedCommitted / totalCommitted) * 100) : 0,
    habitsScheduled: totalHabitsScheduled,
    habitsCompleted: totalHabitsCompleted,
    habitCompletionPct: totalHabitsScheduled > 0 ? Math.round((totalHabitsCompleted / totalHabitsScheduled) * 100) : 0,
    mustWinsCompleted,
    mustWinsTotal,
    happyDays,
    totalDaysRecorded: checkins.length,
    rolloversCount,
    perfectDays,
    bestDay,
    lowestDay,
    mostMissedHabit: maxMisses > 0 ? `${mostMissedHabit} (${maxMisses}x)` : 'None',
    missedReasons: Object.entries(missedReasonsCount)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
  });
});

// Git Repository Sync Endpoints
app.get('/api/git/status', async (req, res) => {
  const status = await getGitStatus();
  const githubInfo = await getGitHubRepoInfo();
  res.json({
    ...status,
    github: {
      owner: githubInfo.owner,
      repo: githubInfo.repo,
      authenticated: githubInfo.authenticated,
    }
  });
});

app.post('/api/git/sync', async (req, res) => {
  const issueResult = await syncGitHubIssues(true).catch(err => ({ success: false, message: (err as Error).message }));
  const gitResult = await performGitSync(req.body.message);
  res.json({
    success: gitResult.success,
    message: `${gitResult.message} ${issueResult?.message || ''}`.trim()
  });
});

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Nindo Local Backend API running on http://localhost:${PORT}`);
});
