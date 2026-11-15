'use strict';

// Keep previously shared one-page links usable after moving each topic.
const routeSegment = location.pathname.replace(/\/+$/, '').split('/').pop() || 'index';
// Cloudflare serves /personagens.html at the clean URL /personagens.
const routePage = routeSegment.endsWith('.html') ? routeSegment : `${routeSegment}.html`;
const formerHomeSections = { '#universo': 'universo.html', '#personagens': 'personagens.html', '#noticias': 'noticias.html', '#trailers': 'trailers.html', '#visao-geral': 'guia.html', '#lucia': 'personagens.html#lucia', '#jason': 'personagens.html#jason' };
const formerGuideSections = { '#elenco': 'personagens.html', '#destinos': 'universo.html', '#materiais': 'trailers.html', '#perguntas': 'perguntas.html' };
for (const id of ['vice-city', 'keys', 'port-gellhorn', 'grassrivers', 'ambrosia', 'kalaga']) formerGuideSections[`#${id}`] = `universo.html#${id}`;
function redirectFormerSection() {
  const formerDestination = routePage === 'index.html' ? formerHomeSections[location.hash] : routePage === 'guia.html' ? formerGuideSections[location.hash] : undefined;
  if (formerDestination) location.replace(new URL(formerDestination, location.href).href);
}
redirectFormerSection();
addEventListener('hashchange', redirectFormerSection);
addEventListener('pageshow', event => { if (event.persisted) redirectFormerSection(); });


const header = document.querySelector('header');
const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');
const progress = document.querySelector('.scroll-progress');
const mobileMenu = matchMedia('(max-width: 1320px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function setMenu(open, restoreFocus = false) {
  nav.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menu.textContent = open ? '×' : '☰';
  if (restoreFocus) menu.focus();
}
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) setMenu(false, true);
});
document.addEventListener('click', event => {
  if (!header.contains(event.target)) setMenu(false);
});
document.addEventListener('focusin', event => {
  if (!header.contains(event.target)) setMenu(false);
});
mobileMenu.addEventListener('change', () => setMenu(false));
header.setAttribute('data-menu-ready', '');

let scrollScheduled = false;
function updateScroll() {
  const maximum = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${maximum > 0 ? Math.min(100, scrollY / maximum * 100) : 0}%`;
  header.classList.toggle('scrolled', scrollY > 25);
  scrollScheduled = false;
}
function scheduleScroll() {
  if (!scrollScheduled) {
    scrollScheduled = true;
    requestAnimationFrame(updateScroll);
  }
}
addEventListener('scroll', scheduleScroll, { passive: true });
addEventListener('resize', scheduleScroll);
updateScroll();

// Content remains visible without JavaScript or observer support.
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  try {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.removeAttribute('data-reveal-pending');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.01 });
    document.querySelectorAll('.reveal').forEach(element => {
      if (element.getBoundingClientRect().top >= innerHeight) {
        observer.observe(element);
        element.setAttribute('data-reveal-pending', '');
      }
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        observer.disconnect();
        document.querySelectorAll('[data-reveal-pending]').forEach(element => element.removeAttribute('data-reveal-pending'));
      }
    });
  } catch {
    document.querySelectorAll('[data-reveal-pending]').forEach(element => element.removeAttribute('data-reveal-pending'));
  }
}

// Pause decorative animations outside the viewport and in background tabs.
if ('IntersectionObserver' in window) {
  const animatedSections = document.querySelectorAll('.hero, .ticker, .feature');
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
  });
  animatedSections.forEach(element => visibility.observe(element));
}
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('page-hidden', document.hidden);
});

// On small screens the current destination remains visible in the tab strip.
const pageTabs = document.querySelector('.page-tabs');
function showCurrentTab() {
  const current = pageTabs?.querySelector('[aria-current="page"]');
  if (current && mobileMenu.matches) pageTabs.scrollLeft = current.offsetLeft - (pageTabs.clientWidth - current.clientWidth) / 2;
}
showCurrentTab();
mobileMenu.addEventListener('change', showCurrentTab);
if (document.fonts) document.fonts.ready.then(showCurrentTab);
