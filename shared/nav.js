// Derive root path from this module's location (shared/nav.js -> root)
const ROOT = new URL('..', import.meta.url).href;

export function initNav() {
  const link = document.createElement('a');
  link.href = ROOT;
  link.className = 'home-btn';
  link.textContent = '<';
  link.title = 'Back to tools';

  const titleRow = document.querySelector('.title-row');
  titleRow.prepend(link);
}
