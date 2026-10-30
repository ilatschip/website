import { el } from './media.js';

// Renders "All, Art Direction, Web Design, …" into `container`.
// Calls onChange(id) on every change and keeps ?category= in the URL.
export function setupFilters(container, categories, onChange) {
  const options = [{ id: 'all', label: 'All' }, ...categories];
  options.forEach((cat, i) => {
    if (i > 0) container.append(', ');
    const btn = el('button', null, cat.label);
    btn.type = 'button';
    btn.dataset.category = cat.id;
    btn.setAttribute('aria-pressed', 'false');
    container.append(btn);
  });

  function select(id) {
    for (const btn of container.children) {
      btn.setAttribute('aria-pressed', String(btn.dataset.category === id));
    }
    const url = new URL(location.href);
    if (id === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', id);
    history.replaceState(null, '', url);
    onChange(id);
  }

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) select(btn.dataset.category);
  });

  const initial = new URLSearchParams(location.search).get('category');
  select(categories.some((c) => c.id === initial) ? initial : 'all');
}

export const inCategory = (id, categories = []) => id === 'all' || categories.includes(id);
