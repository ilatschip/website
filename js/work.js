import { getSiteData, categoryLabels, projectUrl } from './data.js';
import { createMedia, revealOnScroll, el } from './media.js';
import { setupFilters, inCategory } from './filters.js';

const filtersEl = document.querySelector('.filters');
const grid = document.querySelector('.grid');
const empty = document.querySelector('.empty');

function render(data) {
  // Project cards
  const cards = data.projects.map((project) => {
    const card = el('a', 'card');
    card.href = projectUrl(project.slug);
    card.dataset.categories = project.categories.join(' ');

    const media = el('div', 'card__media');
    media.append(createMedia(project.cover));

    const text = el('div', 'card__text');
    text.append(
      el('h2', 'card__title', project.title),
      el('p', 'grey', categoryLabels(data, project.categories)),
    );

    card.append(media, text);
    grid.append(card);
    return card;
  });

  revealOnScroll(cards);

  setupFilters(filtersEl, data.categories, (id) => {
    let visible = 0;
    for (const card of cards) {
      card.hidden = !inCategory(id, card.dataset.categories.split(' '));
      if (!card.hidden) visible++;
    }
    empty.hidden = visible > 0;
  });
}

getSiteData().then(render).catch(console.error);
