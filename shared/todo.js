import { save, load } from './storage.js';

const TOOL = 'todo';

let items = load(TOOL, 'items', []);
let position = load(TOOL, 'position', null);
let isOpen = load(TOOL, 'open', false);
let isMinimized = load(TOOL, 'minimized', false);

let panel, toggleBtn, inputEl, listEl, collapseBtn;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function getDefaultPosition() {
  return {
    x: Math.max(8, window.innerWidth - 380),
    y: Math.max(8, window.innerHeight - 480),
  };
}

function clampPosition(pos) {
  return {
    x: Math.max(0, Math.min(window.innerWidth - 360, pos.x)),
    y: Math.max(0, Math.min(window.innerHeight - 42, pos.y)),
  };
}

function applyPosition(pos) {
  panel.style.left = pos.x + 'px';
  panel.style.top = pos.y + 'px';
}

function renderItems() {
  listEl.innerHTML = '';
  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'todo-item' + (item.done ? ' done' : '');
    el.dataset.id = item.id;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'todo-check';
    check.checked = item.done;

    const text = document.createElement('span');
    text.className = 'todo-item-text';
    text.textContent = item.text;

    const del = document.createElement('button');
    del.className = 'todo-delete';
    del.textContent = '\u00d7';
    del.title = 'Delete';

    el.append(check, text, del);
    listEl.appendChild(el);
  }
}

function addItem(text) {
  text = text.trim();
  if (!text) return;
  items.unshift({ id: Date.now().toString(36), text, done: false });
  save(TOOL, 'items', items);
  renderItems();
  inputEl.value = '';
}

function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.done = !item.done;
  save(TOOL, 'items', items);
  renderItems();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  save(TOOL, 'items', items);
  renderItems();
}

function setOpen(open) {
  isOpen = open;
  panel.classList.toggle('open', open);
  save(TOOL, 'open', open);
}

function setMinimized(min) {
  isMinimized = min;
  panel.classList.toggle('minimized', min);
  collapseBtn.textContent = min ? '\u25b6' : '\u25bc';
  save(TOOL, 'minimized', min);
}

function init() {
  toggleBtn = document.createElement('button');
  toggleBtn.className = 'todo-toggle';
  toggleBtn.textContent = '\u2611';
  toggleBtn.title = 'Daily Tasks';

  panel = document.createElement('div');
  panel.className = 'todo-panel' + (isOpen ? ' open' : '') + (isMinimized ? ' minimized' : '');
  panel.innerHTML = `
    <div class="todo-header">
      <span class="todo-drag-handle">\u2261</span>
      <span class="todo-title">Daily Tasks</span>
      <button class="todo-collapse-btn" title="Collapse">${isMinimized ? '\u25b6' : '\u25bc'}</button>
      <button class="todo-close-btn" title="Close">\u00d7</button>
    </div>
    <div class="todo-body">
      <div class="todo-input-row">
        <input class="todo-input" type="text" placeholder="Add new task...">
        <button class="todo-add">+</button>
      </div>
      <div class="todo-list"></div>
    </div>
  `;

  document.body.appendChild(toggleBtn);
  document.body.appendChild(panel);

  inputEl = panel.querySelector('.todo-input');
  listEl = panel.querySelector('.todo-list');
  collapseBtn = panel.querySelector('.todo-collapse-btn');

  const pos = position ? clampPosition(position) : getDefaultPosition();
  applyPosition(pos);

  renderItems();

  toggleBtn.addEventListener('click', () => setOpen(!isOpen));
  panel.querySelector('.todo-close-btn').addEventListener('click', () => setOpen(false));
  collapseBtn.addEventListener('click', () => setMinimized(!isMinimized));
  panel.querySelector('.todo-add').addEventListener('click', () => addItem(inputEl.value));
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(inputEl.value); });

  listEl.addEventListener('click', e => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.classList.contains('todo-delete')) {
      deleteItem(id);
    } else if (e.target.classList.contains('todo-check')) {
      toggleItem(id);
    } else if (e.target.classList.contains('todo-item-text')) {
      toggleItem(id);
    }
  });

  const header = panel.querySelector('.todo-header');
  header.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - dragOffsetX));
    const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - dragOffsetY));
    applyPosition({ x, y });
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    const rect = panel.getBoundingClientRect();
    position = { x: rect.left, y: rect.top };
    save(TOOL, 'position', position);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
