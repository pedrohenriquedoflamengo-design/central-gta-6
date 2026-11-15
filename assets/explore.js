'use strict';

// Countdown is a date reference, not a promise of regional unlock time.
const countdown = document.querySelector('[data-countdown]');
if (countdown) {
  const target = Date.parse(countdown.dataset.release);
  const clock = countdown.querySelector('[data-countdown-clock]');
  const status = countdown.querySelector('[data-countdown-status]');
  let interval;
  function updateCountdown() {
    if (!Number.isFinite(target)) return;
    const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const values = { days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24, minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60 };
    for (const [unit, value] of Object.entries(values)) countdown.querySelector(`[data-unit="${unit}"]`).textContent = String(value).padStart(2, '0');
    clock.hidden = remaining === 0;
    if (remaining === 0) {
      status.textContent = 'A data anunciada chegou. Confira a disponibilidade nos canais oficiais.';
      clearInterval(interval);
    }
  }
  function resumeCountdown() {
    clearInterval(interval);
    updateCountdown();
    if (!document.hidden && Date.now() < target) interval = setInterval(updateCountdown, 1000);
  }
  resumeCountdown();
  document.addEventListener('visibilitychange', resumeCountdown);
}

const explorer = document.querySelector('[data-map]');
if (explorer) {
  const markers = [...explorer.querySelectorAll('[data-place]')];
  const options = [...explorer.querySelectorAll('[data-region]')];
  const filters = [...explorer.querySelectorAll('[data-filter]')];
  const search = explorer.querySelector('#region-search');
  const detail = explorer.querySelector('#region-detail');
  const viewport = explorer.querySelector('[data-map-viewport]');
  const canvas = explorer.querySelector('[data-map-canvas]');
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  let category = 'all';
  let selected;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let drag;

  function selectRegion(id, saveHash = true) {
    const option = options.find(item => item.dataset.region === id && !item.hidden);
    if (!option) return;
    selected = id;
    const data = option.dataset;
    detail.hidden = false;
    const image = detail.querySelector('[data-region-image]');
    image.src = data.image;
    image.alt = `${data.name} em imagem oficial de GTA VI`;
    detail.querySelector('[data-region-name]').textContent = data.name;
    explorer.querySelector('[data-region-announcement]').textContent = `Região selecionada: ${data.name}. Detalhes disponíveis abaixo do mapa.`;
    detail.querySelector('[data-region-tag]').textContent = data.tag;
    detail.querySelector('[data-region-description]').textContent = data.description;
    detail.querySelector('[data-region-link]').href = `guia.html#${id}`;
    markers.forEach(marker => marker.setAttribute('aria-pressed', String(marker.dataset.place === id)));
    options.forEach(item => item.querySelector('button').setAttribute('aria-pressed', String(item.dataset.region === id)));
    if (saveHash) history.replaceState(null, '', `#${id}`);
  }
  function applyFilters() {
    const query = normalize(search.value);
    options.forEach(option => {
      const visible = (category === 'all' || option.dataset.category === category) && normalize(option.dataset.name).includes(query);
      option.hidden = !visible;
      markers.find(marker => marker.dataset.place === option.dataset.region).hidden = !visible;
    });
    const visible = options.filter(option => !option.hidden);
    explorer.querySelector('[data-map-result]').textContent = `${visible.length} ${visible.length === 1 ? 'região encontrada' : 'regiões encontradas'}`;
    explorer.querySelector('[data-map-empty]').hidden = visible.length !== 0;
    detail.hidden = visible.length === 0;
    if (visible.length && !visible.some(option => option.dataset.region === selected)) selectRegion(visible[0].dataset.region);
  }
  function transformMap() {
    const maxX = viewport.clientWidth * (scale - 1) / 2;
    const maxY = viewport.clientHeight * (scale - 1) / 2;
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    viewport.dataset.zoomed = String(scale > 1);
    explorer.querySelector('[data-zoom-level]').textContent = `${Math.round(scale * 100)}%`;
    explorer.querySelector('[data-zoom="in"]').disabled = scale >= 2;
    explorer.querySelector('[data-zoom="out"]').disabled = scale <= 1;
  }
  options.forEach(option => {
    const link = option.querySelector('a');
    const button = document.createElement('button');
    button.type = 'button';
    button.append(...[...link.childNodes].map(node => node.cloneNode(true))); // Preserve static labels without parsing HTML.
    button.setAttribute('aria-controls', 'region-detail');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => selectRegion(option.dataset.region));
    link.replaceWith(button);
  });
  markers.forEach(marker => marker.addEventListener('click', () => selectRegion(marker.dataset.place)));
  search.addEventListener('input', applyFilters);
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    applyFilters();
  }));
  explorer.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    scale = button.dataset.zoom === 'reset' ? 1 : Math.max(1, Math.min(2, scale + (button.dataset.zoom === 'in' ? .25 : -.25)));
    if (button.dataset.zoom === 'reset') panX = panY = 0;
    transformMap();
  }));
  viewport.addEventListener('pointerdown', event => {
    if (scale === 1 || event.target.closest('button') || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: panX, startY: panY };
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    panX = drag.startX + event.clientX - drag.x;
    panY = drag.startY + event.clientY - drag.y;
    transformMap();
  });
  const endDrag = () => { drag = undefined; };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('lostpointercapture', endDrag);
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || scale === 1) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') panX += 45;
    if (event.key === 'ArrowRight') panX -= 45;
    if (event.key === 'ArrowUp') panY += 45;
    if (event.key === 'ArrowDown') panY -= 45;
    transformMap();
  });
  addEventListener('resize', transformMap);
  addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (options.some(option => option.dataset.region === id)) {
      category = 'all';
      search.value = '';
      filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')));
      applyFilters();
      selectRegion(id, false);
    }
  });
  explorer.querySelectorAll('[data-map-tools], [data-map-controls]').forEach(element => { element.hidden = false; });
  viewport.tabIndex = 0;
  explorer.querySelector('[data-map-help]').textContent = 'Toque em um destino ou use a lista. Após aproximar, arraste o mapa; no teclado, use as setas com o mapa em foco.';
  explorer.setAttribute('data-map-ready', '');
  selectRegion(options.some(item => item.dataset.region === location.hash.slice(1)) ? location.hash.slice(1) : 'vice-city', false);
  transformMap();
}
