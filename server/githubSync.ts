import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Task } from '../shared/types.js';
import { getToday } from '../shared/dateUtils.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TASKS_FILE = path.join(ROOT_DIR, 'data', 'tasks.json');

// Explicitly load .env from ROOT_DIR
dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  token?: string;
  authenticated: boolean;
}

export async function getGitHubRepoInfo(): Promise<GitHubRepoInfo> {
  let owner = 'sai-teja-celigo';
  let repo = 'nindo';
  let token: string | undefined = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!token) {
    try {
      const { stdout } = await execAsync('git config --get-all http.extraheader');
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('authorization:')) {
          const authVal = line.split(':')[1]?.trim();
          if (authVal?.toLowerCase().startsWith('basic ')) {
            const decoded = Buffer.from(authVal.slice(6).trim(), 'base64').toString('utf-8');
            token = decoded.split(':')[1] || decoded;
          } else if (authVal?.toLowerCase().startsWith('bearer ')) {
            token = authVal.slice(7).trim();
          }
        }
      }
    } catch {}
  }

  if (!token) {
    try {
      const { stdout: cfgToken } = await execAsync('git config --get github.token');
      if (cfgToken.trim()) token = cfgToken.trim();
    } catch {}
  }

  try {
    const { stdout } = await execAsync('git remote get-url origin');
    const url = stdout.trim();

    const tokenMatch = url.match(/https:\/\/([^:@]+)@github\.com/);
    if (tokenMatch && tokenMatch[1] !== 'git') {
      token = tokenMatch[1];
    }

    const ownerRepoMatch = url.match(/github\.com[:\/]([^\/]+)\/([^\/\s\.]+)/);
    if (ownerRepoMatch) {
      owner = ownerRepoMatch[1];
      repo = ownerRepoMatch[2].replace(/\.git$/, '');
    }
  } catch (err) {
    console.warn('Could not determine git remote origin:', (err as Error).message);
  }

  return {
    owner,
    repo,
    token,
    authenticated: Boolean(token),
  };
}

async function getOctokit(): Promise<{ octokit: Octokit; owner: string; repo: string; token?: string }> {
  const info = await getGitHubRepoInfo();
  const octokit = new Octokit({
    auth: info.token || undefined,
  });
  return { octokit, owner: info.owner, repo: info.repo, token: info.token };
}

export function parseIssueMetadata(body: string, labels: any[] = [], assignees: any[] = []): Partial<Task> {
  const metadata: Partial<Task> = {};

  // Parse labels
  if (Array.isArray(labels)) {
    const userLabel = labels.find((l: any) => {
      const name = typeof l === 'string' ? l : l?.name;
      return typeof name === 'string' && name.startsWith('user:');
    });
    if (userLabel) {
      const name = typeof userLabel === 'string' ? userLabel : userLabel.name;
      metadata.owner = name.replace('user:', '').toLowerCase();
    }
  }

  // Parse assignees
  if (!metadata.owner && Array.isArray(assignees) && assignees.length > 0) {
    const firstAssignee = assignees[0]?.login?.toLowerCase();
    if (firstAssignee) {
      metadata.owner = firstAssignee;
    }
  }

  if (!body) return metadata;

  // JSON metadata comment block
  const jsonMatch = body.match(/<!--\s*metadata\s*([\s\S]*?)\s*-->/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return { ...metadata, ...parsed };
    } catch {}
  }

  // Parse issue body lines / forms
  const lines = body.split('\n');
  let inMetaBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('## Task Metadata')) {
      inMetaBlock = true;
      continue;
    }

    if (line.includes(':')) {
      const parts = line.split(':');
      const rawKey = parts[0].trim().toLowerCase().replace(/^#+\s*/, '');
      const val = parts.slice(1).join(':').trim();

      if (rawKey === 'owner' || rawKey === 'assignee' || rawKey === 'assigned to') {
        metadata.owner = val.toLowerCase();
      }
      if (rawKey === 'originalduedate' || rawKey === 'due date' || rawKey === 'duedate') {
        metadata.originalDueDate = val;
        if (!metadata.currentDueDate) metadata.currentDueDate = val;
      }
      if (rawKey === 'currentduedate') metadata.currentDueDate = val;
      if (rawKey === 'rollovercount') metadata.rolloverCount = parseInt(val, 10) || 0;
      if (rawKey === 'status') metadata.status = val.toUpperCase() as any;
      if (rawKey === 'createdduringday') metadata.createdDuringDay = val === 'true';
    }

    // GitHub Issue Form headings e.g. ### Owner \n kox
    if (line.startsWith('###')) {
      const headerText = line.replace(/^###\s*/, '').trim().toLowerCase();
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith('#')) {
        if (headerText === 'owner' || headerText === 'assignee') {
          metadata.owner = nextLine.toLowerCase();
        }
        if (headerText === 'due date' || headerText === 'due') {
          metadata.originalDueDate = nextLine;
          if (!metadata.currentDueDate) metadata.currentDueDate = nextLine;
        }
      }
    }
  }

  return metadata;
}

export function formatIssueBody(task: Task): string {
  return `## Task Details
${task.title}

## Task Metadata
owner: ${task.owner}
originalDueDate: ${task.originalDueDate}
currentDueDate: ${task.currentDueDate}
rolloverCount: ${task.rolloverCount}
status: ${task.status}
createdDuringDay: ${task.createdDuringDay}

<!-- metadata
${JSON.stringify(task, null, 2)}
-->`;
}

export async function syncGitHubIssues(): Promise<{ success: boolean; syncedCount: number; message: string }> {
  try {
    const { octokit, owner, repo, token } = await getOctokit();

    if (!token) {
      console.warn('[GitHub Sync] No GITHUB_TOKEN found in environment or .env file.');
      return {
        success: false,
        syncedCount: 0,
        message: 'No GITHUB_TOKEN provided in .env file.',
      };
    }

    const today = getToday();

    // 1. Fetch all remote issues from GitHub repo
    const { data: remoteIssues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 100,
    });

    console.log(`[GitHub Sync] Fetched ${remoteIssues.length} issues from GitHub (${owner}/${repo})`);

    // 2. Read local tasks
    let localTasks: Task[] = [];
    if (fs.existsSync(TASKS_FILE)) {
      try {
        localTasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
      } catch {
        localTasks = [];
      }
    }

    let updatedCount = 0;

    // 3. Process remote issues into local tasks
    for (const issue of remoteIssues) {
      if (issue.pull_request) continue;

      const parsedMeta = parseIssueMetadata(issue.body || '', issue.labels, issue.assignees);
      const isClosed = issue.state === 'closed';
      const status: 'OPEN' | 'COMPLETED' | 'DROPPED' = isClosed
        ? (parsedMeta.status === 'DROPPED' ? 'DROPPED' : 'COMPLETED')
        : 'OPEN';

      const existingIndex = localTasks.findIndex(
        t => t.githubIssueNumber === issue.number || t.id === `gh-${issue.number}`
      );

      // Clean title from form or metadata formatting if any
      let cleanTitle = issue.title.replace(/^\[TODO\]:\s*/i, '');

      if (existingIndex >= 0) {
        const existing = localTasks[existingIndex];
        let changed = false;

        if (existing.title !== cleanTitle) {
          existing.title = cleanTitle;
          changed = true;
        }
        if (existing.status !== status) {
          existing.status = status;
          if (status === 'COMPLETED') existing.completedAt = new Date().toISOString();
          changed = true;
        }
        if (!existing.githubIssueNumber) {
          existing.githubIssueNumber = issue.number;
          existing.githubIssueUrl = issue.html_url;
          changed = true;
        }

        if (changed) {
          localTasks[existingIndex] = existing;
          updatedCount++;
        }
      } else {
        const newTask: Task = {
          id: `gh-${issue.number}`,
          githubIssueNumber: issue.number,
          githubIssueUrl: issue.html_url,
          title: cleanTitle,
          owner: parsedMeta.owner || 'soit',
          createdAt: issue.created_at || new Date().toISOString(),
          originalDueDate: parsedMeta.originalDueDate || today,
          currentDueDate: parsedMeta.currentDueDate || today,
          status,
          rolloverCount: parsedMeta.rolloverCount || 0,
          createdDuringDay: parsedMeta.createdDuringDay || false,
        };

        localTasks.push(newTask);
        updatedCount++;
        console.log(`[GitHub Sync] Imported new issue #${issue.number}: "${cleanTitle}" (Owner: ${newTask.owner})`);
      }
    }

    // 4. Push any local tasks without a githubIssueNumber up to GitHub
    let permissionDenied = false;
    for (let i = 0; i < localTasks.length; i++) {
      if (permissionDenied) break;
      const task = localTasks[i];
      if (!task.githubIssueNumber) {
        try {
          const body = formatIssueBody(task);
          const labels = ['todo', `user:${task.owner}`];

          const res = await octokit.rest.issues.create({
            owner,
            repo,
            title: task.title,
            body,
            labels,
          });

          task.githubIssueNumber = res.data.number;
          task.githubIssueUrl = res.data.html_url;
          localTasks[i] = task;
          updatedCount++;
        } catch (err: any) {
          if (err?.status === 403 || (err?.message && err.message.includes('403'))) {
            console.warn('[GitHub Sync] GITHUB_TOKEN lacks write permission to create issues on GitHub. Syncing existing issues only.');
            permissionDenied = true;
            break;
          }
          try {
            const body = formatIssueBody(task);
            const res = await octokit.rest.issues.create({
              owner,
              repo,
              title: task.title,
              body,
            });
            task.githubIssueNumber = res.data.number;
            task.githubIssueUrl = res.data.html_url;
            localTasks[i] = task;
            updatedCount++;
          } catch (e2: any) {
            if (e2?.status === 403 || (e2?.message && e2.message.includes('403'))) {
              console.warn('[GitHub Sync] GITHUB_TOKEN lacks write permission to create issues on GitHub. Syncing existing issues only.');
              permissionDenied = true;
              break;
            }
            console.warn(`Failed to create issue for task "${task.title}":`, (e2 as Error).message);
          }
        }
      }
    }

    // Save updated tasks file
    fs.writeFileSync(TASKS_FILE, JSON.stringify(localTasks, null, 2), 'utf-8');

    return {
      success: true,
      syncedCount: updatedCount,
      message: `GitHub issues sync complete (${updatedCount} updated/added).`,
    };
  } catch (err) {
    console.error('[GitHub Sync] Error:', (err as Error).message);
    return {
      success: false,
      syncedCount: 0,
      message: `GitHub issues sync error: ${(err as Error).message}`,
    };
  }
}
