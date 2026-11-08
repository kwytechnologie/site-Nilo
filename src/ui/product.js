export function initProduct() {
  const product = document.getElementById('produto');
  const tabs = [...product.querySelectorAll('[role="tab"]')];
  const panels = [...product.querySelectorAll('[role="tabpanel"]')];
  const magnetic = matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

  function resetMagnet(tab) {
    tab.style.removeProperty('--pull-x');
    tab.style.removeProperty('--pull-y');
  }
  magnetic.addEventListener('change', () => tabs.forEach(resetMagnet));

  function select(tab) {
    for (const button of tabs) {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute('aria-controls');
    product.dataset.detail = tab.dataset.detail;
  }

  if (matchMedia('(min-width: 761px)').matches) select(tabs[1]);

  for (const [index, tab] of tabs.entries()) {
    let center = null;
    tab.addEventListener('pointerenter', event => {
      if (!magnetic.matches || event.pointerType !== 'mouse') return;
      const r = tab.getBoundingClientRect();
      center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    tab.addEventListener('pointermove', event => {
      if (!center || !magnetic.matches || event.pointerType !== 'mouse') return;
      tab.style.setProperty('--pull-x', `${Math.max(-8, Math.min(8, (event.clientX - center.x) * .18))}px`);
      tab.style.setProperty('--pull-y', `${Math.max(-5, Math.min(5, (event.clientY - center.y) * .18))}px`);
    }, { passive: true });
    for (const event of ['pointerleave', 'pointercancel', 'blur']) tab.addEventListener(event, () => {
      center = null;
      resetMagnet(tab);
    });
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      resetMagnet(tab);
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
