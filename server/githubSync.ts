import { exec } from 'child_process';
import { promisify } from 'util';
import { Task } from '../shared/types.js';
import { getToday } from '../shared/dateUtils.js';

const execAsync = promisify(exec);

export interface GitHubStatus {
  authenticated: boolean;
  username?: string;
  repoName?: string;
  repoUrl?: string;
}

export async function getGitHubStatus(): Promise<GitHubStatus> {
  try {
    const { stdout: authOut } = await execAsync('gh auth status');
    const userMatch = authOut.match(/Logged in to github\.com account ([^\s]+)/) || authOut.match(/Logged in to github\.com as ([^\s]+)/);
    const username = userMatch ? userMatch[1] : undefined;

    let repoName: string | undefined;
    let repoUrl: string | undefined;

    try {
      const { stdout: repoOut } = await execAsync('gh repo view --json nameWithOwner,url');
      const data = JSON.parse(repoOut);
      repoName = data.nameWithOwner;
      repoUrl = data.url;
    } catch {
      // not in a git repo with GitHub origin
    }

    return {
      authenticated: true,
      username,
      repoName,
      repoUrl,
    };
  } catch {
    return { authenticated: false };
  }
}

export function parseIssueMetadata(body: string, labels: any[] = []): Partial<Task> {
  const metadata: Partial<Task> = {};

  // Parse user label if available (e.g. "user:soit" or "user:kox")
  if (Array.isArray(labels)) {
    const userLabel = labels.find((l: any) => typeof l.name === 'string' && l.name.startsWith('user:'));
    if (userLabel) {
      metadata.owner = userLabel.name.replace('user:', '');
    }
  }

  if (!body) return metadata;

  // Try parsing JSON block inside comment block first
  const jsonMatch = body.match(/<!--\s*metadata\s*([\s\S]*?)\s*-->/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return { ...metadata, ...parsed };
    } catch {
      // ignore
    }
  }

  // Parse markdown metadata section
  const lines = body.split('\n');
  let inMeta = false;
  for (const line of lines) {
    if (line.includes('## Task Metadata')) {
      inMeta = true;
      continue;
    }
    if (inMeta) {
      if (line.startsWith('##')) break;
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        if (key === 'owner') metadata.owner = val;
        if (key === 'originalDueDate') metadata.originalDueDate = val;
        if (key === 'currentDueDate') metadata.currentDueDate = val;
        if (key === 'rolloverCount') metadata.rolloverCount = parseInt(val, 10) || 0;
        if (key === 'status') metadata.status = val as any;
        if (key === 'createdDuringDay') metadata.createdDuringDay = val === 'true';
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

export async function createGitHubIssue(task: Task): Promise<{ number?: number; url?: string }> {
  try {
    const body = formatIssueBody(task);
    const labels = `todo,user:${task.owner}`;
    const cmd = `gh issue create --title ${JSON.stringify(task.title)} --body ${JSON.stringify(body)} --label ${JSON.stringify(labels)}`;
    const { stdout } = await execAsync(cmd);
    const url = stdout.trim();
    const match = url.match(/\/issues\/(\d+)$/);
    const number = match ? parseInt(match[1], 10) : undefined;
    return { number, url };
  } catch (err) {
    console.warn('GitHub Issue creation failed (falling back to local storage):', (err as Error).message);
    return {};
  }
}

export async function updateGitHubIssue(task: Task): Promise<boolean> {
  if (!task.githubIssueNumber) return false;
  try {
    const body = formatIssueBody(task);
    let stateCmd = '';
    if (task.status === 'COMPLETED' || task.status === 'DROPPED') {
      stateCmd = `gh issue close ${task.githubIssueNumber} && `;
    }
    const editCmd = `gh issue edit ${task.githubIssueNumber} --title ${JSON.stringify(task.title)} --body ${JSON.stringify(body)}`;
    await execAsync(`${stateCmd}${editCmd}`);
    return true;
  } catch (err) {
    console.warn(`GitHub Issue update for #${task.githubIssueNumber} failed:`, (err as Error).message);
    return false;
  }
}

export async function fetchRemoteGitHubIssues(): Promise<Partial<Task>[]> {
  try {
    const { stdout } = await execAsync('gh issue list --label todo --state all --json number,title,body,state,labels,url');
    const rawIssues = JSON.parse(stdout);
    const today = getToday();

    return rawIssues.map((issue: any) => {
      const parsedMeta = parseIssueMetadata(issue.body, issue.labels);
      const isClosed = issue.state === 'CLOSED';
      
      const status: 'OPEN' | 'COMPLETED' | 'DROPPED' = isClosed 
        ? (parsedMeta.status === 'DROPPED' ? 'DROPPED' : 'COMPLETED') 
        : 'OPEN';

      return {
        id: `gh-${issue.number}`,
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.url,
        title: issue.title.replace(/^\[TODO\]:\s*/i, ''),
        owner: parsedMeta.owner || 'soit',
        originalDueDate: parsedMeta.originalDueDate || today,
        currentDueDate: parsedMeta.currentDueDate || today,
        rolloverCount: parsedMeta.rolloverCount || 0,
        status,
        createdDuringDay: parsedMeta.createdDuringDay || false,
        createdAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('Failed to fetch remote GitHub issues:', (err as Error).message);
    return [];
  }
}
