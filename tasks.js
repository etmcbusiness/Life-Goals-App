const TaskManager = (function () {
  const TASKS_KEY = 'businessTasks';
  const COMPLETION_KEY = 'businessTaskCompletion';

  const DEFAULT_TASKS = [
    { text: 'Send 5 follow-up messages to leads', frequency: 'DAILY', effort: 'EASY' },
    { text: 'Post before/after photos on social media', frequency: 'DAILY', effort: 'EASY' },
    { text: 'Check and respond to all inquiries', frequency: 'DAILY', effort: 'EASY' },
    { text: 'Quote at least 1 new job', frequency: 'DAILY', effort: 'MEDIUM' },
    { text: 'Review finances and log income', frequency: 'DAILY', effort: 'EASY' },
    { text: 'Reach out to 10 new potential clients', frequency: 'WEEKLY', effort: 'MEDIUM' },
    { text: 'Follow up with past clients for repeat bookings', frequency: 'WEEKLY', effort: 'MEDIUM' },
    { text: 'Review and adjust pricing', frequency: 'MONTHLY', effort: 'HARD' },
    { text: "Plan next month's marketing push", frequency: 'MONTHLY', effort: 'HARD' }
  ];

  function getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  function loadTasks() {
    let tasks;
    try {
      tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || 'null');
    } catch (e) {
      tasks = null;
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      tasks = DEFAULT_TASKS;
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }

    return tasks;
  }

  function loadCompletionState(tasks) {
    let state;
    try {
      state = JSON.parse(localStorage.getItem(COMPLETION_KEY) || '{}');
    } catch (e) {
      state = {};
    }

    const today = getTodayKey();
    if (state.dailyDate !== today) {
      tasks.forEach((task, i) => {
        if (task.frequency === 'DAILY') {
          state[`task-${i}`] = false;
        }
      });
      state.dailyDate = today;
      localStorage.setItem(COMPLETION_KEY, JSON.stringify(state));
    }

    return state;
  }

  function saveCompletionState(state) {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify(state));
  }

  function renderList(tasks, state, containerId, frequency) {
    const list = document.getElementById(containerId);
    list.innerHTML = '';

    const filtered = tasks
      .map((task, i) => ({ ...task, originalIndex: i }))
      .filter((task) => task.frequency === frequency);

    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className = 'task-empty';
      li.textContent = `No ${frequency.toLowerCase()} tasks.`;
      list.appendChild(li);
      return;
    }

    filtered.forEach((task) => {
      const done = state[`task-${task.originalIndex}`] || false;
      const li = document.createElement('li');
      li.className = `task-row ${done ? 'task-done' : ''}`;
      li.setAttribute('data-task-index', String(task.originalIndex));
      li.innerHTML = `
        <div class="task-row-left">
          <span class="task-check">${done ? '▮' : '▯'}</span>
          <span class="task-name">${task.text}</span>
        </div>
        <div class="task-row-right">
          <span class="effort-tag effort-${task.effort.toLowerCase()}">${task.effort}</span>
        </div>
      `;
      list.appendChild(li);
    });
  }

  function renderDailyProgress(tasks, state) {
    const dailyTasks = tasks.map((task, i) => ({ ...task, i })).filter((task) => task.frequency === 'DAILY');
    const total = dailyTasks.length;
    const done = dailyTasks.filter((task) => state[`task-${task.i}`]).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('taskProgressPercent').textContent = `${percent}%`;
    document.getElementById('taskProgressFill').style.width = `${percent}%`;
  }

  function renderAll(tasks, state) {
    renderList(tasks, state, 'dailyList', 'DAILY');
    renderList(tasks, state, 'weeklyList', 'WEEKLY');
    renderList(tasks, state, 'monthlyList', 'MONTHLY');
    renderDailyProgress(tasks, state);
  }

  function initialize() {
    const tasks = loadTasks();
    const state = loadCompletionState(tasks);
    renderAll(tasks, state);

    ['dailyList', 'weeklyList', 'monthlyList'].forEach((listId) => {
      document.getElementById(listId).addEventListener('click', (event) => {
        const row = event.target instanceof Element ? event.target.closest('.task-row') : null;
        if (!row) return;

        const index = Number(row.getAttribute('data-task-index'));
        if (Number.isNaN(index)) return;

        state[`task-${index}`] = !state[`task-${index}`];
        saveCompletionState(state);
        renderAll(tasks, state);
      });
    });
  }

  return { initialize };
})();

