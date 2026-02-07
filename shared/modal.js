export function initHelpModal() {
  const modal = document.getElementById('helpModal');
  const toggle = (open) => modal.classList.toggle('open', open);

  document.querySelector('.help-btn').addEventListener('click', () => toggle(true));
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') toggle(false);
  });
  document.querySelector('.modal-close').addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(false);
  });
}
