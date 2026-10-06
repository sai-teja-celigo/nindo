import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { Task } from '../shared/types.js';

const execAsync = promisify(exec);

export async function isGhAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('gh auth status');
    return true;
  } catch {
    return false;
  }
}

export function parseIssueMetadata(body: string): Partial<Task> {
  const metadata: Partial<Task> = {};
  if (!body) return metadata;

  // Try parsing JSON block inside comments first
  const jsonMatch = body.match(/<!--\s*metadata\s*([\s\S]*?)\s*-->/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
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
