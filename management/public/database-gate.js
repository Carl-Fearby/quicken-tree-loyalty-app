(() => {
  const password = 'letmein';
  let unlocked = false;
  function setup() {
    const databaseTab = document.querySelector('[data-tab="database"]');
    const menuTab = document.querySelector('[data-tab="menu"]');
    const database = document.getElementById('database-workspace');
    const menu = document.getElementById('menu-workspace');
    if (!databaseTab || !menuTab || !database || !menu) return;
    function show(tab) {
      if (tab === 'database' && !unlocked) {
        let dialog = document.getElementById('database-gate-dialog');
        if (!dialog) {
          dialog = document.createElement('dialog');
          dialog.id = 'database-gate-dialog';
          dialog.innerHTML = '<form method="dialog"><h2>Database management</h2><p>Enter the password to continue.</p><input id="database-gate-input" type="password" placeholder="Password" required><p id="database-gate-error"></p><div class="database-gate-actions"><button type="button" id="database-gate-cancel">Cancel</button><button value="unlock">Unlock</button></div></form>';
          document.body.append(dialog);
        }
        dialog.querySelector('#database-gate-error').textContent = '';
        dialog.querySelector('#database-gate-input').value = '';
        dialog.showModal();
        dialog.querySelector('form').onsubmit = event => {
          event.preventDefault();
          if (dialog.querySelector('#database-gate-input').value !== password) {
            dialog.querySelector('#database-gate-error').textContent = 'Incorrect password.';
            return;
          }
          unlocked = true;
          dialog.close();
          show('database');
        };
        dialog.querySelector('#database-gate-cancel').onclick = () => dialog.close();
        dialog.querySelector('#database-gate-input').focus();
        return;
      }
      database.hidden = tab !== 'database';
      menu.hidden = tab !== 'menu';
      databaseTab.setAttribute('aria-selected', String(tab === 'database'));
      menuTab.setAttribute('aria-selected', String(tab === 'menu'));
    }
    databaseTab.addEventListener('click', event => { event.preventDefault(); show('database'); });
    menuTab.addEventListener('click', event => { event.preventDefault(); show('menu'); });
    show('menu');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
