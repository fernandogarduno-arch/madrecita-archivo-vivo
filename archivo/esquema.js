const STATIONS = [
  ['valles', 17, 37],
  ['centro', 50, 46],
  ['altos-sur', 80, 17],
  ['cienega', 84, 56],
  ['lagunas', 56, 81],
  ['sierra-de-amula', 19, 82]
];

export function createMapViews(regions, other, chooseRegion) {
  const scheme = document.getElementById('conceptual-map');
  const limits = document.getElementById('map-limits');
  const modeButtons = Array.from(document.querySelectorAll('[data-map-mode]'));
  const nodes = new Map();
  let mode = 'conceptual';
  let selectedSlug = '';

  function changeMode(next) {
    mode = next;
    scheme.hidden = mode !== 'conceptual';
    limits.hidden = mode !== 'limits';
    for (const button of modeButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode));
    }
  }

  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      const next = button.dataset.mapMode;
      changeMode(next);
      const visible = next === 'limits' ? selectedSlug !== 'otros' : nodes.has(selectedSlug);
      if (!visible) chooseRegion('valles', null, true);
    });
  }

  function makeNode(region) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'route-node';
    button.dataset.region = region.slug;
    button.setAttribute('aria-label', region.name + ', ' + region.count + ' fichas');
    const title = document.createElement('strong');
    title.textContent = region.name;
    const count = document.createElement('small');
    count.textContent = region.count.toLocaleString('es-MX') + ' fichas';
    button.append(title, count);
    button.onclick = () => chooseRegion(region.slug, null, true);
    nodes.set(region.slug, button);
    return button;
  }

  const board = document.getElementById('route-board');
  for (const [slug, x, y] of STATIONS) {
    const region = regions.find(item => item.slug === slug);
    if (!region) continue;
    const button = makeNode(region);
    button.style.left = x + '%';
    button.style.top = y + '%';
    board.append(button);
  }
  document.getElementById('other-stop').prepend(makeNode(other));
  changeMode('conceptual');

  return {
    select(region) {
      selectedSlug = region.slug;
      if (!nodes.has(region.slug) && mode === 'conceptual') changeMode('limits');
      if (region.slug === 'otros' && mode === 'limits') changeMode('conceptual');
      for (const [slug, node] of nodes) {
        node.setAttribute('aria-pressed', String(region.slug === slug));
      }
    }
  };
}

