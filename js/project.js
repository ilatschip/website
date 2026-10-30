import { getSiteData, categoryLabels, projectUrl } from './data.js';
import { createMedia, revealOnScroll, el } from './media.js';

const main = document.querySelector('main');

function infoColumn(label, value) {
  const col = el('div');
  col.append(el('p', 'grey', label));
  if (value instanceof Node) col.append(value);
  else col.append(el('p', null, value));
  return col;
}

function render(data) {
  const slug = new URLSearchParams(location.search).get('p');
  const i = data.projects.findIndex((p) => p.slug === slug);

  if (i === -1) {
    const msg = el('p', 'empty', 'Project not found. ');
    const back = el('a', 'grey', 'Back to work');
    back.href = 'work.html';
    msg.append(back);
    main.append(msg);
    return;
  }

  const project = data.projects[i];
  const count = data.projects.length;
  const prev = data.projects[(i - 1 + count) % count];
  const next = data.projects[(i + 1) % count];
  document.title = `${project.title} — Ilana Tschiptschin`;

  // Full-width hero
  const hero = el('figure', 'project-hero');
  hero.append(createMedia(project.cover, { eager: true }));

  // Title · Categories · Description · Location
  const info = el('section', 'info-grid');
  info.append(
    infoColumn('Project', el('h1', 'bold', project.title)),
    infoColumn('Categories', categoryLabels(data, project.categories)),
    infoColumn('Description', project.description),
    infoColumn('Location', [project.location, project.year].filter(Boolean).join(', ')),
    infoColumn('Credits', project.credits || ''),
  );

  // Gallery: items are "full" or "half" width
  const gallery = el('section', 'project-media');
  const items = project.media.map((item) => {
    const fig = el('figure', item.width === 'half' ? 'half' : 'full');
    fig.append(createMedia(item));
    gallery.append(fig);
    return fig;
  });

  // Previous / Next (loops around)
  const nav = el('nav', 'project-nav');
  const prevLink = el('a', null, 'Previous');
  prevLink.href = projectUrl(prev.slug);
  prevLink.title = prev.title;
  const nextLink = el('a', null, 'Next');
  nextLink.href = projectUrl(next.slug);
  nextLink.title = next.title;
  nav.append(prevLink, nextLink);

  main.append(hero, info, gallery, nav);
  revealOnScroll(items);
}

// Close: back to the Work page, keeping the filter the visitor came from
const close = document.querySelector('.project-close');
const ref = document.referrer && new URL(document.referrer);
if (ref && ref.origin === location.origin && ref.pathname.endsWith('/work.html')) {
  close.href = ref.pathname + ref.search;
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') location.href = close.href;
});

getSiteData().then(render).catch(console.error);
