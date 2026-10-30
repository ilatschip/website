import { getSiteData, categoryLabels, projectUrl } from './data.js';
import { createMedia, revealOnScroll, el } from './media.js';

const filtersEl = document.querySelector('.filters');
const grid = document.querySelector('.grid');
const empty = document.querySelector('.empty');

function render(data) {
  // Filter buttons: "All" + every category
  const options = [{ id: 'all', label: 'All' }, ...data.categories];
  // Inline list: "All, Art Direction, Web Design, …"
  options.forEach((cat, i) => {
    if (i > 0) filtersEl.append(', ');
    const btn = el('button', null, cat.label);
    btn.type = 'button';
    btn.dataset.category = cat.id;
    btn.setAttribute('aria-pressed', 'false');
    filtersEl.append(btn);
  });

  // Project cards
  const cards = data.projects.map((project) => {
    const card = el('a', 'card');
    card.href = projectUrl(project.slug);
    card.dataset.categories = project.categories.join(' ');

    const media = el('div', 'card__media');
    media.append(createMedia(project.cover));

    const text = el('div', 'card__text');
    text.append(
      el('h2', 'card__title bold', project.title),
      el('p', 'grey', categoryLabels(data, project.categories)),
    );

    card.append(media, text);
    grid.append(card);
    return card;
  });

  revealOnScroll(cards);

  function applyFilter(id) {
    let visible = 0;
    for (const card of cards) {
      const match = id === 'all' || card.dataset.categories.split(' ').includes(id);
      card.hidden = !match;
      if (match) visible++;
    }
    for (const btn of filtersEl.children) {
      btn.setAttribute('aria-pressed', String(btn.dataset.category === id));
    }
    empty.hidden = visible > 0;

    const url = new URL(location.href);
    if (id === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', id);
    history.replaceState(null, '', url);
  }

  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) applyFilter(btn.dataset.category);
  });

  const initial = new URLSearchParams(location.search).get('category');
  applyFilter(data.categories.some((c) => c.id === initial) ? initial : 'all');
}

getSiteData().then(render).catch(console.error);
