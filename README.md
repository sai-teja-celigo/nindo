# 🥷 Nindo — Local-First Productivity & Accountability for Friends

> **Morning commitment → Work through today's tasks → End-of-day review → Productivity score → Compare progress over time**

Nindo is a local-first, minimal daily accountability app designed for two friends. Backed by local files and GitHub Issues for task sync.

---

## 🚀 Quick Start

### 1. Install Dependencies & Launch App

```bash
npm install
npm run dev
```

This starts:
- **Express Backend API** on `http://localhost:3001`
- **Vite React Frontend** on `http://localhost:5173`

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 💻 Laptop Quick Add (CLI)

Add tasks directly from your terminal using the built-in CLI wrapper:

```bash
npm run todo -- "Finish CDC debugging"
npm run todo -- "Finish project" tomorrow
npm run todo -- "Write README" weekend
npm run todo -- "Finish API" +7
npm run todo -- "Submit form" month
npm run todo -- "Dentist" 2026-10-20
```

You can also link the executable globally or run `./bin/todo.js "Task Title" tomorrow`.

---

## 📱 Mobile Quick Add (GitHub Issue Form)

Add tasks from GitHub Mobile or web using the provided GitHub Issue Form template:
- `.github/ISSUE_TEMPLATE/todo.yml`

Simply open a new issue on your GitHub repository to create tasks on the go!

---

## 📊 Core Concepts

1. **Task**: Unique item with `originalDueDate`, `currentDueDate`, and `rolloverCount`. Rollovers preserve original due date history so past productivity ratings remain accurate.
2. **Daily Habits**: Configurable recurring checklist items for each user (`config/habits.json`).
3. **Daily Commitment**: Morning snapshot (`[ Start Day ]`) locking committed tasks and Must Win choice into `data/commitments/`.
4. **End-of-Day Check-In**: Evening review (`[ End Day ]`) evaluating completion, handling incomplete task rollovers, logging 4-level mood (😄 Happy, 🙂 Not as productive, 😕 Bad, 😫 Worse), and locking daily state into `data/checkins/`.
5. **Leaderboard & Review**: Side-by-side metric comparison and weekly summary report.

---

## 📁 Repository Structure

```text
nindo/
├── app/ -> src/         # React + TypeScript + Vite frontend
├── server/              # Express Node.js API server & GitHub Sync
├── config/
│   ├── users.json       # User profiles configuration
│   └── habits.json      # Daily habits configuration
├── data/
│   ├── tasks.json       # Tasks persistence buffer
│   ├── commitments/     # Daily morning snapshots
│   └── checkins/        # End-of-day check-in logs
├── bin/
│   └── todo.js          # Laptop Quick Add CLI
├── .github/
│   └── ISSUE_TEMPLATE/  # GitHub Issue Form template
└── shared/              # Shared types and date utilities
```
