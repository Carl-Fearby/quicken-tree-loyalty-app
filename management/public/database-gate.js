(() => {
  const password = 'letmein';
  let unlocked = false;
  function getDialog() {
    let dialog = document.getElementById('database-gate-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'database-gate-dialog';
    dialog.innerHTML = '<form method="dialog"><h2>Database management</h2><p>Enter the password to continue.</p><input id="database-gate-input" type="password" placeholder="Password" required><p id="database-gate-error"></p><div class="database-gate-actions"><button type="button" id="database-gate-cancel">Cancel</button><button value="unlock">Unlock</button></div></form>';
    document.body.append(dialog);
    return dialog;
  }
  function openDatabase() { window.dispatchEvent(new Event('quicken-tree-open-database-management')); }
  function requestDatabase() {
    if (unlocked) return openDatabase();
    const dialog = getDialog();
    const input = dialog.querySelector('#database-gate-input');
    dialog.querySelector('#database-gate-error').textContent = '';
    input.value = '';
    dialog.showModal();
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      if (input.value !== password) {
        dialog.querySelector('#database-gate-error').textContent = 'Incorrect password.';
        return;
      }
      unlocked = true;
      dialog.close();
      openDatabase();
    };
    dialog.querySelector('#database-gate-cancel').onclick = () => dialog.close();
    input.focus();
  }
  window.addEventListener('quicken-tree-request-database-management', requestDatabase);
})();
