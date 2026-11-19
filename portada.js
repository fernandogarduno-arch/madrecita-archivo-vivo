(() => {
  const background=document.getElementById('hero-background');
  const button=document.getElementById('motion-toggle');
  const credit=document.getElementById('scene-credit');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const scenes=[
    ['assets/portadas/galeria','La Casona · Interpretación artística',true],
    ['assets/detalles/vidrio','Botellas en su repisa · Fotografía familiar'],
    ['assets/detalles/ceramica','Cerámica y piedra · Fotografía familiar'],
    ['assets/portadas/agaves','Agaves · Portada artística',true],
    ['assets/portadas/casa-retana','Reserva Retana · Diseño de la casa',true]
  ];
  let i=new URLSearchParams(location.search).get('portada')==='casa-retana'?4:0,timer;
  function paint() {
    const [path,label,portrait]=scenes[i],pic=document.createElement('picture');
    if (portrait) {const source=document.createElement('source');source.media='(orientation:portrait)';source.srcset=path+'-vertical.webp';pic.append(source);}
    const img=new Image();img.alt='';img.fetchPriority='high';img.src=path+'.webp';pic.append(img);
    background.replaceChildren(pic);background.dataset.scene=path.split('/').pop();credit.textContent=label;
  }
  function play(on) {
    clearInterval(timer);background.dataset.motion=on?'on':'off';
    button.textContent=on?'Pausar animación':'Ver imágenes';button.setAttribute('aria-pressed',String(on));
    if(on) timer=setInterval(()=>{if(!document.hidden&&!background.hidden){i=(i+1)%scenes.length;paint();}},6500);
  }
  function start(){if(!background.firstChild){paint();play(!motion.matches);}}
  button.onclick=()=>{const on=background.dataset.motion!=='on';if(on){i=(i+1)%scenes.length;paint();}play(on);};
  motion.addEventListener('change',()=>play(!motion.matches));
  window.addEventListener('madrecita:portada',start);
  if(document.documentElement.dataset.entry!=='loading')start();
})();
