import { getSiteData, categoryLabels, projectUrl } from './data.js';
import { createMedia, revealOnScroll, el } from './media.js';
import { setupFilters, inCategory } from './filters.js';

const filtersEl = document.querySelector('.filters');
const grid = document.querySelector('.archive');
const empty = document.querySelector('.empty');

const box = document.querySelector('.lightbox');
const boxMedia = box.querySelector('.lightbox__media');
const boxTitle = box.querySelector('.lightbox__title');
const boxMeta = box.querySelector('.lightbox__meta');

// Set to true to open images large (or link to their project) on click.
const CLICKABLE = false;

const caption = (item) => [item.title, item.year].filter(Boolean).join(', ');

function render(data) {
  const items = data.archive ?? [];
  const projectOf = (item) => item.project && data.projects.find((p) => p.slug === item.project);

  // Tiles: link to the project when there is one, otherwise open the lightbox.
  // While CLICKABLE is false, tiles are plain images.
  const tiles = items.map((item) => {
    const project = CLICKABLE && projectOf(item);
    const tile = el(project ? 'a' : CLICKABLE ? 'button' : 'div', 'tile');
    if (project) tile.href = projectUrl(project.slug);
    else if (CLICKABLE) {
      tile.type = 'button';
      tile.addEventListener('click', () => open(item));
    }
    tile.dataset.categories = (item.categories ?? []).join(' ');

    const media = el('span', 'tile__media');
    media.append(createMedia({ ...item, alt: item.alt || item.title }));
    tile.append(media, el('span', 'tile__caption grey', caption(item)));
    grid.append(tile);
    return tile;
  });
  revealOnScroll(tiles);

  // ---------- Lightbox (archive-only items currently visible) ----------
  let current = -1;
  const browsable = () => items.filter((item, i) => !tiles[i].hidden && !projectOf(item));

  function show(item) {
    current = browsable().indexOf(item);
    boxMedia.replaceChildren(createMedia({ ...item, alt: item.alt || item.title }, { eager: true }));
    boxTitle.textContent = item.title || '';
    boxMeta.textContent = [item.year, categoryLabels(data, item.categories ?? [])].filter(Boolean).join(', ');
  }

  function open(item) {
    show(item);
    box.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function close() {
    box.hidden = true;
    boxMedia.replaceChildren();
    document.documentElement.style.overflow = '';
  }

  function step(delta) {
    const list = browsable();
    if (list.length) show(list[(current + delta + list.length) % list.length]);
  }

  box.querySelector('.lightbox__close').addEventListener('click', close);
  box.querySelector('.lightbox__prev').addEventListener('click', () => step(-1));
  box.querySelector('.lightbox__next').addEventListener('click', () => step(1));
  boxMedia.addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  if (!items.length) {
    empty.hidden = false;
    return;
  }
  setupFilters(filtersEl, data.categories, (id) => {
    let visible = 0;
    items.forEach((item, i) => {
      tiles[i].hidden = !inCategory(id, item.categories);
      if (!tiles[i].hidden) visible++;
    });
    empty.hidden = visible > 0;
  });
}

getSiteData().then(render).catch(console.error);
