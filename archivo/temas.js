const storageKey = 'madrecita.tema-vitrina';
const themes = new Map([
  ['caliza', 'Caliza'],
  ['nocturna', 'Nocturna']
]);

function readPreference() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

const urlTheme = new URL(location.href).searchParams.get('tema');
let selected = themes.has(urlTheme) ? urlTheme : readPreference();
if (!themes.has(selected)) selected = 'caliza';

function paint(theme) {
  selected = theme;
  document.documentElement.dataset.vitrina = theme;
  for (const button of document.querySelectorAll('[data-tema]')) {
    button.setAttribute('aria-pressed', String(button.dataset.tema === theme));
  }
}

function choose(theme) {
  paint(theme);
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // La elección sigue activa mientras esta página esté abierta.
  }
  const url = new URL(location.href);
  if (url.searchParams.has('tema')) {
    url.searchParams.set('tema', theme);
    history.replaceState(history.state, '', url);
  }
}

for (const host of document.querySelectorAll('[data-selector-tema]')) {
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', 'Tema de exhibición');
  const label = document.createElement('span');
  label.className = 'theme-label';
  label.textContent = 'Tema';
  host.append(label);

  for (const [value, name] of themes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tema = value;
    button.textContent = name;
    button.addEventListener('click', () => choose(value));
    host.append(button);
  }
}

paint(selected);
addEventListener('storage', event => {
  if (event.key === storageKey && themes.has(event.newValue) &&
      !new URL(location.href).searchParams.has('tema')) paint(event.newValue);
});

