export function initHelpModal() {
  const modal = document.getElementById('helpModal');
  if (!modal) return;

  const helpBtn = document.querySelector('.help-btn');
  const closeBtn = document.querySelector('.modal-close');

  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const modalContent = modal.querySelector('.modal');
  const heading = modalContent?.querySelector('h2');
  if (heading) {
    heading.id = heading.id || 'helpModalTitle';
    modal.setAttribute('aria-labelledby', heading.id);
  }

  const toggle = (open) => {
    modal.classList.toggle('open', open);
    if (open && closeBtn) closeBtn.focus();
  };

  if (helpBtn) helpBtn.addEventListener('click', () => toggle(true));
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') toggle(false);
  });
  if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(false);
  });
}
