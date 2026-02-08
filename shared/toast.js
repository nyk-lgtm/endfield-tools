let toastEl = null;
let hideTimeout = null;

function ensureElement() {
  if (toastEl) return;
  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  document.body.appendChild(toastEl);
}

export function showToast(message, duration = 3000) {
  ensureElement();
  clearTimeout(hideTimeout);
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  hideTimeout = setTimeout(() => toastEl.classList.remove('visible'), duration);
}
