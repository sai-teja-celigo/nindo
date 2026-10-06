import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitStatus {
  isGitRepo: boolean;
  branch?: string;
  remoteUrl?: string;
  hasUncommittedChanges?: boolean;
}

export async function getGitStatus(): Promise<GitStatus> {
  try {
    const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD');
    const branch = branchOut.trim();

    let remoteUrl: string | undefined;
    try {
      const { stdout: remoteOut } = await execAsync('git remote get-url origin');
      remoteUrl = remoteOut.trim();
    } catch {
      // no origin remote
    }

    let hasUncommittedChanges = false;
    try {
      const { stdout: statusOut } = await execAsync('git status --porcelain');
      hasUncommittedChanges = statusOut.trim().length > 0;
    } catch {
      // ignore
    }

    return {
      isGitRepo: true,
      branch,
      remoteUrl,
      hasUncommittedChanges,
    };
  } catch {
    return { isGitRepo: false };
  }
}

let isSyncingGit = false;

export async function performGitSync(commitMessage?: string): Promise<{ success: boolean; message: string }> {
  if (isSyncingGit) {
    return { success: true, message: 'Git sync is already in progress.' };
  }
  isSyncingGit = true;

  try {
    // 1. Stage config, data and project changes
    await execAsync('git add -A');

    // 2. Check if there are staged changes to commit
    let committed = false;
    try {
      const msg = commitMessage || `chore(sync): update tasks, commitments & check-ins [${new Date().toISOString()}]`;
      await execAsync(`git commit -m ${JSON.stringify(msg)}`);
      committed = true;
    } catch {
      // Nothing staged to commit
    }

    // 3. Get current branch name
    let branch = 'main';
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
      branch = stdout.trim() || 'main';
    } catch {
      // fallback
    }

    // 4. Fetch and rebase latest changes from remote origin using autostash
    let pulled = false;
    try {
      await execAsync(`git fetch origin ${branch}`);
      await execAsync(`git rebase --autostash origin/${branch}`);
      pulled = true;
    } catch (err) {
      console.warn('git rebase failed:', (err as Error).message);
    }

    // 5. Push local commits to remote origin
    let pushed = false;
    try {
      await execAsync(`git push origin ${branch}`);
      pushed = true;
    } catch (err) {
      console.warn('git push failed:', (err as Error).message);
    }

    const summaryParts: string[] = [];
    if (committed) summaryParts.push('committed local changes');
    if (pulled) summaryParts.push('pulled remote updates');
    if (pushed) summaryParts.push('pushed to remote repository');

    const message = summaryParts.length > 0 
      ? `Git sync completed: ${summaryParts.join(', ')}.` 
      : 'Git repository is fully up to date.';

    return { success: true, message };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error('Git sync error:', errorMsg);
    return { success: false, message: `Git sync failed: ${errorMsg}` };
  } finally {
    isSyncingGit = false;
  }
}
