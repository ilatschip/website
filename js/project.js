import { getSiteData, categoryLabels, projectUrl } from './data.js';
import { createMedia, revealOnScroll, el } from './media.js';

const main = document.querySelector('main');

function infoColumn(label, value) {
  const col = el('div');
  col.append(el('p', 'grey small', label));
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
  const next = data.projects[(i + 1) % data.projects.length];
  document.title = `${project.title} — Ilana Tschiptschin`;

  // Full-width hero
  const hero = el('figure', 'project-hero');
  hero.append(createMedia(project.cover, { eager: true }));

  // Title · Categories · Description · Location
  const info = el('section', 'project-info');
  info.append(
    infoColumn('Project', el('h1', 'bold', project.title)),
    infoColumn('Categories', categoryLabels(data, project.categories)),
    infoColumn('Description', project.description),
    infoColumn('Location', [project.location, project.year].filter(Boolean).join(', ')),
  );

  // Gallery: items are "full" or "half" width
  const gallery = el('section', 'project-media');
  const items = project.media.map((item) => {
    const fig = el('figure', item.width === 'half' ? 'half' : 'full');
    fig.append(createMedia(item));
    gallery.append(fig);
    return fig;
  });

  // Next project
  const nextLink = el('a', 'next-project');
  nextLink.href = projectUrl(next.slug);
  nextLink.append(el('span', 'grey small', 'Next project'), el('span', 'bold', `${next.title} →`));

  main.append(hero, info, gallery, nextLink);
  revealOnScroll(items);
}

getSiteData().then(render).catch(console.error);
