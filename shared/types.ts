export type TaskStatus = 'OPEN' | 'COMPLETED' | 'DROPPED';

export type MoodType = 'HAPPY' | 'NOT_AS_PRODUCTIVE' | 'BAD' | 'WORSE';

export type ProductivityReason = 
  | 'Distracted' 
  | 'Task was too big' 
  | 'Unexpected work' 
  | 'Low energy' 
  | 'Blocked' 
  | 'Didn\'t have enough time' 
  | 'Other';

export interface Task {
  id: string;
  title: string;
  owner: string; // 'user1' | 'user2'
  createdAt: string;
  originalDueDate: string; // YYYY-MM-DD
  currentDueDate: string;  // YYYY-MM-DD
  completedAt?: string | null;
  status: TaskStatus;
  rolloverCount: number;
  createdDuringDay: boolean;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
}

export interface DailyHabit {
  id: string;
  name: string;
  owner: string;
  frequency: 'daily';
}

export interface DailyCommitment {
  date: string; // YYYY-MM-DD
  user: string; // 'user1' | 'user2'
  startedAt: string;
  committedTaskIds: string[];
  mustWinTaskId?: string;
  status: 'ACTIVE' | 'CLOSED';
}

export interface DailyCheckIn {
  date: string; // YYYY-MM-DD
  user: string;
  committedTasks: string[];
  completedTasks: string[];
  completedHabits: string[];
  totalHabits: number;
  mustWinCompleted?: boolean;
  mood: MoodType;
  optionalReason?: ProductivityReason | string;
  finishedAt: string;
}

export interface UserConfig {
  id: string;
  name: string;
  githubUsername: string;
  avatar?: string;
  weekStart: 'monday' | 'sunday';
  timezone: string;
}

export interface AppSettings {
  users: UserConfig[];
  habits: DailyHabit[];
  githubRepo?: {
    owner: string;
    repo: string;
  };
}

export interface UserMetrics {
  user: UserConfig;
  commitmentCompletionPct: number; // formula: completed committed tasks / committed tasks * 100
  totalTasksCompleted: number;
  habitCompletionPct: number;
  happyDaysCount: number; // Happy + Not as productive count
  mustWinsCompleted: number;
  mustWinsTotal: number;
  rolloversCount: number;
  perfectDaysCount: number;
  moodCounts: Record<MoodType, number>;
  positiveDaysCount: number;
  totalCheckInsCount: number;
}
