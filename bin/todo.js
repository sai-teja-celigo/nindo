#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const USERS_FILE = path.join(ROOT_DIR, 'config', 'users.json');
const TASKS_FILE = path.join(ROOT_DIR, 'data', 'tasks.json');

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Nindo Quick Add CLI

Usage:
  todo "<task title>" [due-date-shortcut]

Examples:
  todo "Finish CDC debugging"
  todo "Finish project" tomorrow
  todo "Write README" weekend
  todo "Finish API" +7
  todo "Submit form" month
  todo "Dentist" 2026-10-20

Due date shortcuts:
  today (default), tomorrow, weekend, +7, month, +30, or YYYY-MM-DD
  `);
  process.exit(0);
}

const title = args[0];
const shortcut = args[1] || 'today';

// Resolve owner
let owner = 'soit';
try {
  if (fs.existsSync(USERS_FILE)) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (users && users.length > 0) owner = users[0].id;
  }
} catch {
  // fallback
}

// Make POST request to local server API, or fallback to file write directly
async function addTodo() {
  try {
    const response = await fetch('http://localhost:3001/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        owner,
        dueDateShortcut: shortcut,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`\x1b[32m✓ Created task:\x1b[0m "${data.task.title}" (Due: ${data.task.currentDueDate}, Owner: ${data.task.owner})`);
      if (data.task.githubIssueNumber) {
        console.log(`  └─ GitHub Issue #${data.task.githubIssueNumber}: ${data.task.githubIssueUrl}`);
      }
      return;
    }
  } catch {
    // API server not running, fallback to writing directly to tasks.json
  }

  // Date calculation helper for fallback mode
  function resolveDueDate(sc) {
    const d = new Date();
    const formatYMD = (date) => date.toISOString().split('T')[0];
    if (sc === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      return formatYMD(d);
    }
    if (sc === 'weekend') {
      const day = d.getDay();
      const diff = day === 6 ? 0 : day === 0 ? 0 : 6 - day;
      d.setDate(d.getDate() + diff);
      return formatYMD(d);
    }
    if (sc === '+7') {
      d.setDate(d.getDate() + 7);
      return formatYMD(d);
    }
    if (sc === 'month') {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return formatYMD(lastDay);
    }
    if (sc === '+30') {
      d.setDate(d.getDate() + 30);
      return formatYMD(d);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(sc)) {
      return sc;
    }
    return formatYMD(d);
  }

  const calculatedDueDate = resolveDueDate(shortcut);
  const today = new Date().toISOString().split('T')[0];
  let tasks = [];
  try {
    if (fs.existsSync(TASKS_FILE)) {
      tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    }
  } catch {
    tasks = [];
  }

  const newTask = {
    id: Date.now().toString(),
    title: title.trim(),
    owner,
    createdAt: new Date().toISOString(),
    originalDueDate: calculatedDueDate,
    currentDueDate: calculatedDueDate,
    status: 'OPEN',
    rolloverCount: 0,
    createdDuringDay: false,
  };

  tasks.push(newTask);
  const dataDir = path.dirname(TASKS_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');

  console.log(`\x1b[32m✓ Saved task locally:\x1b[0m "${newTask.title}" (Due: ${newTask.currentDueDate}, Owner: ${newTask.owner})`);
}

addTodo();

