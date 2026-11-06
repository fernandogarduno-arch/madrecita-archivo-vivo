(() => {
  const scenes = ['galeria', 'estantes', 'mesa', 'agaves', 'casa-retana'];
  const key = 'madrecita.portada.anterior';
  const background = document.getElementById('hero-background');
  const toggle = document.getElementById('motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');

  function selectScene() {
    if (new URLSearchParams(location.search).get('portada') === 'casa-retana') return 'casa-retana';
    let index = Math.floor(Math.random() * scenes.length);
    try {
      const previous = scenes.indexOf(localStorage.getItem(key));
      if (previous !== -1) index = (previous + 1) % scenes.length;
      localStorage.setItem(key, scenes[index]);
    } catch {
      // Con almacenamiento restringido, la selección sigue funcionando al azar.
    }
    return scenes[index];
  }

  function setMotion(enabled) {
    background.dataset.motion = enabled ? 'on' : 'off';
    toggle.textContent = enabled ? 'Pausar animación' : 'Activar animación';
    toggle.setAttribute('aria-pressed', String(enabled));
  }

  function showCover() {
    if (background.firstElementChild) return;
    const scene = selectScene();
    background.dataset.scene = scene;
    if (scene === 'casa-retana') {
      const link = document.createElement('a');
      link.href = 'botella/';
      link.style.color = 'inherit';
      link.textContent = 'Ver el diseño de la botella ↗';
      document.querySelector('.intro .lead').replaceChildren(
        'Madrecita · La botella de Casa Retana.', document.createElement('br'), link
      );
    }
    const picture = document.createElement('picture');
    const portrait = document.createElement('source');
    portrait.media = '(orientation: portrait)';
    portrait.srcset = 'assets/portadas/' + scene + '-vertical.webp';
    const img = document.createElement('img');
    img.alt = '';
    img.fetchPriority = 'high';
    picture.append(portrait, img);
    img.src = 'assets/portadas/' + scene + '.webp';
    background.append(picture);
    setMotion(!preference.matches);
  }

  toggle.addEventListener('click', () => setMotion(background.dataset.motion !== 'on'));
  preference.addEventListener('change', () => setMotion(!preference.matches));
  window.addEventListener('madrecita:portada', showCover);
  if (document.documentElement.dataset.entry !== 'loading') {
    showCover();
  }
})();
