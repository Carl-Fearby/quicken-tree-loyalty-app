(() => {
  const key = 'qt-back-office-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch {}
  const valid = value => value === 'light' || value === 'dark';
  function apply() {
    const theme = valid(preference) ? preference : system.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    if (document.body) document.body.classList.toggle('dark-mode', theme === 'dark');
    const button = document.getElementById('theme-toggle');
    if (button) {
      const dark = theme === 'dark';
      button.checked = dark;
      button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    }
  }
  apply();
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = event.newValue;
      apply();
    }
  });
  function bind() {
    apply();
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    if (button.dataset.bound) return;
    button.dataset.bound = 'true';
    button.addEventListener('change', () => {
      preference = button.checked ? 'dark' : 'light';
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
