// Single entry point for site content.
// Today it reads a static JSON file; when the backend exists, point
// DATA_URL at the API endpoint (or replace getSiteData) — nothing else changes.

const DATA_URL = 'data/site.json';

let cache;

export function getSiteData() {
  cache ??= fetch(DATA_URL).then((res) => {
    if (!res.ok) throw new Error(`Could not load ${DATA_URL} (${res.status})`);
    return res.json();
  });
  return cache;
}

export function categoryLabels(data, ids) {
  return ids
    .map((id) => data.categories.find((c) => c.id === id)?.label)
    .filter(Boolean)
    .join(', ');
}

export function projectUrl(slug) {
  return `project.html?p=${encodeURIComponent(slug)}`;
}
