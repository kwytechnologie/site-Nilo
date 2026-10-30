// Menu do celular: abre no botão, fecha no Esc ou num toque fora. Devolve o closeMenu.
export function initMenu() {
  const btn = document.querySelector('[data-menu]');
  const menu = document.getElementById('menu-movel');
  function closeMenu() {
    if (!menu.hidden) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  }
  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  });
  return closeMenu;
}
