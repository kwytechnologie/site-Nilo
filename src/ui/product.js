export function initProduct() {
  const product = document.getElementById('produto');
  const tabs = [...product.querySelectorAll('[role="tab"]')];
  const panels = [...product.querySelectorAll('[role="tabpanel"]')];

  function select(tab) {
    for (const button of tabs) {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute('aria-controls');
    product.dataset.detail = tab.dataset.detail;
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(tabs[next]);
      tabs[next].focus({ preventScroll: true });
    });
  }
}
