// Uses `config` (config.js), `Repo` (github.js) and `prepareFile` (files.js),
// loaded before this file as plain scripts so the admin also works when opened
// straight from disk.

const TOKEN_KEY = 'admin-token';
const app = document.querySelector('#app');

const state = {
  repo: null,
  data: null,          // content being edited
  saved: null,         // content as last loaded/saved (to find removed files)
  sha: null,           // blob sha of site.json when loaded (detects edits elsewhere)
  pending: new Map(),  // path -> { base64, url } for files not yet committed
  view: 'projects',    // 'projects' | 'project' | 'home' | 'archive' | 'info'
  project: null,       // project being edited
  autoSlug: false,     // slug follows the title (new projects only)
  dirty: false,
  status: '',
};

// ---------- DOM helper ----------
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key in el) el[key] = value;
    else el.setAttribute(key, value);
  }
  return el;
}

const clone = (obj) => JSON.parse(JSON.stringify(obj));

function setDirty() {
  state.dirty = true;
  state.status = 'Unsaved changes';
  updateBar();
}

function move(list, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  setDirty();
  render();
}

function remove(list, i, what) {
  if (!confirm(`Remove this ${what}?`)) return;
  list.splice(i, 1);
  setDirty();
  render();
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------- Form controls ----------
function input(obj, key, props = {}, afterInput) {
  return h('input', {
    type: 'text', value: obj[key] ?? '', ...props,
    oninput: (e) => { obj[key] = e.target.value; setDirty(); afterInput?.(); },
  });
}

// Grows with its content so long texts are fully visible.
function textarea(obj, key, rows = 4) {
  const fit = (el) => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px`; };
  const el = h('textarea', {
    rows, value: obj[key] ?? '',
    oninput: (e) => { obj[key] = e.target.value; setDirty(); fit(e.target); },
  });
  requestAnimationFrame(() => fit(el));
  return el;
}

function field(label, control, note) {
  return h('label', { class: 'field' },
    h('span', { class: 'label' }, label), control,
    note && h('span', { class: 'note' }, note));
}

function buttons(list, i, what) {
  return h('span', { class: 'row-buttons' },
    h('button', { type: 'button', title: 'Move up', onclick: () => move(list, i, -1), disabled: i === 0 }, '↑'),
    h('button', { type: 'button', title: 'Move down', onclick: () => move(list, i, 1), disabled: i === list.length - 1 }, '↓'),
    h('button', { type: 'button', title: `Remove ${what}`, onclick: () => remove(list, i, what) }, 'Remove'));
}

// Shows committed files from the site; new uploads from memory.
function preview(item) {
  if (!item?.src) return h('div', { class: 'thumb empty' }, 'No file');
  const src = state.pending.get(item.src)?.url
    ?? `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${item.src}`;
  return item.type === 'video'
    ? h('video', { class: 'thumb', src, muted: true, loop: true, autoplay: true, playsInline: true })
    : h('img', { class: 'thumb', src, alt: '' });
}

// File picker that uploads into memory and hands back media items.
function filePicker(label, folder, onFiles, multiple = false) {
  return h('label', { class: 'button' }, label,
    h('input', {
      type: 'file', accept: 'image/*,video/*', multiple, hidden: true,
      onchange: async (e) => {
        const files = [...e.target.files];
        e.target.value = '';
        state.status = 'Preparing files…';
        updateBar();
        const items = [];
        for (const file of files) {
          try {
            const prepared = await prepareFile(file, folder());
            state.pending.set(prepared.path, prepared);
            items.push({ type: prepared.type, src: prepared.path });
          } catch (err) {
            alert(err.message);
          }
        }
        if (items.length) { onFiles(items); setDirty(); render(); }
        else { state.status = state.dirty ? 'Unsaved changes' : ''; updateBar(); }
      },
    }));
}

const projectFolder = (p) => () => `images/projects/${p.slug || 'untitled'}`;

// ---------- Views ----------
function projectsView() {
  const { projects } = state.data;
  return h('section', {},
    h('div', { class: 'view-head' },
      h('h1', {}, 'Projects'),
      h('button', { type: 'button', class: 'button', onclick: newProject }, 'New project')),
    h('p', { class: 'note' }, 'The order here is the order on the Work page.'),
    h('ul', { class: 'list' }, projects.map((p, i) =>
      h('li', { class: 'list-row' },
        h('button', { type: 'button', class: 'list-main', onclick: () => openProject(p) },
          preview(p.cover),
          h('span', {}, h('strong', {}, p.title || 'Untitled'), h('br'),
            h('span', { class: 'grey' }, categoryLabels(p.categories), p.year ? ` · ${p.year}` : ''))),
        buttons(projects, i, 'project')))));
}

function categoryLabels(ids) {
  return ids.map((id) => state.data.categories.find((c) => c.id === id)?.label).filter(Boolean).join(', ');
}

function newProject() {
  const project = {
    slug: '', title: '', year: new Date().getFullYear(), categories: [],
    location: '', description: '', credits: '', cover: null, media: [],
  };
  state.data.projects.unshift(project);
  setDirty();
  openProject(project, true);
}

function openProject(project, isNew = false) {
  state.view = 'project';
  state.project = project;
  state.autoSlug = isNew; // new projects take their slug from the title until it is edited
  render();
  scrollTo(0, 0);
}

function projectView() {
  const p = state.project;
  let oldSlug = p.slug;

  const slugInput = input(p, 'slug', {}, () => { state.autoSlug = false; });
  slugInput.addEventListener('change', () => {
    p.slug = slugify(p.slug);
    slugInput.value = p.slug;
    renameSlides(oldSlug, p.slug);
    oldSlug = p.slug;
  });

  const titleInput = input(p, 'title', {}, () => {
    if (!state.autoSlug) return;
    p.slug = slugify(p.title);
    slugInput.value = p.slug;
  });

  const yearInput = h('input', {
    type: 'number', value: p.year ?? '',
    oninput: (e) => { p.year = e.target.value ? Number(e.target.value) : ''; setDirty(); },
  });

  const cats = categoryChecks(p);

  const cover = h('div', { class: 'media-item' },
    preview(p.cover),
    h('div', { class: 'media-controls' },
      filePicker(p.cover ? 'Replace cover' : 'Upload cover', projectFolder(p),
        ([item]) => { p.cover = { ...item, alt: p.cover?.alt ?? p.title }; }),
      p.cover && field('Alt text', input(p.cover, 'alt'), 'Short description for screen readers'),
    ));

  const media = h('div', { class: 'media-grid' }, p.media.map((item, i) =>
    h('div', { class: `media-item ${item.width === 'half' ? 'half' : 'full'}` },
      preview(item),
      h('div', { class: 'media-controls' },
        h('div', { class: 'segmented' },
          ['full', 'half'].map((w) => h('button', {
            type: 'button', class: item.width === w ? 'is-on' : '',
            onclick: () => { item.width = w; setDirty(); render(); },
          }, w === 'full' ? 'Full width' : 'Half width'))),
        field('Alt text', input(item, 'alt')),
        h('span', { class: 'row-buttons' },
          filePicker('Replace', projectFolder(p), ([next]) => { Object.assign(item, next); })),
        buttons(p.media, i, 'image')))));

  return h('section', {},
    h('div', { class: 'view-head' },
      h('button', { type: 'button', class: 'link', onclick: () => { state.view = 'projects'; render(); } }, '← All projects'),
      p.slug && h('a', { href: `${config.siteUrl}project.html?p=${encodeURIComponent(p.slug)}`, target: '_blank' }, 'View on site ↗')),
    h('div', { class: 'form' },
      field('Title', titleInput),
      field('Slug', slugInput, 'Used in the web address. Lowercase letters, numbers and dashes.'),
      field('Year', yearInput),
      field('Location', input(p, 'location')),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Categories'), cats),
      field('Description', textarea(p, 'description', 6)),
      field('Credits', textarea(p, 'credits', 3), 'One credit per line.'),
    ),
    h('h2', {}, 'Cover'),
    h('p', { class: 'note' }, 'Shown full width at the top of the project and on the Work page.'),
    cover,
    h('h2', {}, 'Images and videos'),
    h('p', { class: 'note' }, 'Shown below the project info, top to bottom. Two half-width items in a row sit side by side.'),
    media,
    filePicker('Add images or videos', projectFolder(p), (items) => {
      p.media.push(...items.map((it) => ({ ...it, alt: '', width: 'full' })));
    }, true),
    h('div', { class: 'danger' },
      h('button', {
        type: 'button', class: 'button',
        onclick: () => {
          if (!confirm(`Delete "${p.title || 'this project'}"? This can't be undone after saving.`)) return;
          state.data.projects.splice(state.data.projects.indexOf(p), 1);
          state.data.home.slides = state.data.home.slides.filter((s) => s.project !== p.slug);
          for (const item of state.data.archive ?? []) if (item.project === p.slug) item.project = '';
          setDirty();
          state.view = 'projects';
          render();
        },
      }, 'Delete project')));
}

function renameSlides(from, to) {
  if (!from || from === to) return;
  for (const slide of state.data.home.slides) if (slide.project === from) slide.project = to;
  for (const item of state.data.archive ?? []) if (item.project === from) item.project = to;
}

// Category checkboxes for anything with a `categories` array (kept in site order).
function categoryChecks(obj) {
  obj.categories ??= [];
  return h('div', { class: 'checks' }, state.data.categories.map((c) =>
    h('label', {},
      h('input', {
        type: 'checkbox', checked: obj.categories.includes(c.id),
        onchange: (e) => {
          obj.categories = state.data.categories.map((x) => x.id)
            .filter((id) => (id === c.id ? e.target.checked : obj.categories.includes(id)));
          setDirty();
        },
      }), ' ', c.label)));
}

function homeView() {
  const { slides } = state.data.home;
  const projectOptions = (selected) => [
    h('option', { value: '', selected: !selected }, '— No link —'),
    ...state.data.projects.map((p) => h('option', { value: p.slug, selected: p.slug === selected }, p.title || 'Untitled')),
  ];

  return h('section', {},
    h('div', { class: 'view-head' }, h('h1', {}, 'Homepage slideshow')),
    h('p', { class: 'note' }, 'Images show for 4 seconds; videos play to the end. The caption links to the chosen project.'),
    h('div', { class: 'media-grid' }, slides.map((slide, i) => {
      const project = state.data.projects.find((p) => p.slug === slide.project);
      return h('div', { class: 'media-item half' },
        preview(slide),
        h('div', { class: 'media-controls' },
          field('Links to project', h('select', {
            onchange: (e) => { slide.project = e.target.value; setDirty(); },
          }, projectOptions(slide.project))),
          h('span', { class: 'row-buttons' },
            filePicker('Replace', () => 'images/home', ([next]) => { Object.assign(slide, next); }),
            project?.cover && h('button', {
              type: 'button',
              onclick: () => { Object.assign(slide, { type: project.cover.type, src: project.cover.src }); setDirty(); render(); },
            }, 'Use project cover')),
          buttons(slides, i, 'slide')));
    })),
    filePicker('Add slides', () => 'images/home', (items) => {
      slides.push(...items.map((it) => ({ project: '', ...it, alt: '' })));
    }, true));
}

function archiveView() {
  state.data.archive ??= [];
  const items = state.data.archive;
  let dragFrom = null;

  const projectOptions = (selected) => [
    h('option', { value: '', selected: !selected }, '— None (opens large) —'),
    ...state.data.projects.map((p) => h('option', { value: p.slug, selected: p.slug === selected }, p.title || 'Untitled')),
  ];

  return h('section', {},
    h('div', { class: 'view-head' },
      h('h1', {}, 'Archive'),
      filePicker('Add images', () => 'images/archive', (added) => {
        items.unshift(...added.map((it) => ({ ...it, title: '', year: '', categories: [], project: '' })));
      }, true)),
    h('p', { class: 'note' }, 'Select many files at once. New images are added at the top. Drag a picture to reorder. Title, year and categories are optional; a linked project opens instead of the large view.'),
    h('div', { class: 'archive-grid' }, items.map((item, i) =>
      h('div', {
        class: 'archive-card',
        ondragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('is-over'); },
        ondragleave: (e) => e.currentTarget.classList.remove('is-over'),
        ondrop: (e) => {
          e.preventDefault();
          if (dragFrom == null || dragFrom === i) return render();
          const [moved] = items.splice(dragFrom, 1);
          items.splice(i, 0, moved);
          setDirty();
          render();
        },
      },
        h('div', {
          class: 'drag', draggable: true, title: 'Drag to reorder',
          ondragstart: (e) => { dragFrom = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); },
        }, preview(item)),
        field('Title', input(item, 'title')),
        field('Year', input(item, 'year')),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Categories'), categoryChecks(item)),
        field('Links to project', h('select', {
          onchange: (e) => { item.project = e.target.value; setDirty(); },
        }, projectOptions(item.project))),
        buttons(items, i, 'image')))));
}

function infoView() {
  const { sections } = state.data.info;
  return h('section', {},
    h('div', { class: 'view-head' }, h('h1', {}, 'Info page')),
    h('p', { class: 'note' }, 'Each section is a column. Year and link are optional. A link can be a web address, mailto:you@example.com or tel:+49…'),
    sections.map((section, s) =>
      h('div', { class: 'card' },
        h('div', { class: 'card-head' },
          field('Section title', input(section, 'label')),
          buttons(sections, s, 'section')),
        h('ol', { class: 'entries' }, section.items.map((item, i) =>
          h('li', { class: 'entry' },
            field('Year', input(item, 'year', { class: 'short' })),
            field('Text', textarea(item, 'text', 2)),
            field('Link', input(item, 'href', { placeholder: 'Optional' })),
            buttons(section.items, i, 'entry')))),
        h('button', {
          type: 'button', class: 'button',
          onclick: () => { section.items.push({ text: '' }); setDirty(); render(); },
        }, 'Add entry'))),
    h('button', {
      type: 'button', class: 'button',
      onclick: () => { sections.push({ label: 'New section', items: [] }); setDirty(); render(); },
    }, 'Add section'));
}

// ---------- Top bar ----------
function bar() {
  const tab = (view, label) => h('button', {
    type: 'button',
    class: state.view === view || (view === 'projects' && state.view === 'project') ? 'is-on' : '',
    onclick: () => { state.view = view; render(); },
  }, label);

  return h('header', { class: 'bar' },
    h('strong', {}, 'ADMIN'),
    h('nav', {}, tab('projects', 'Projects'), tab('home', 'Homepage'), tab('archive', 'Archive'), tab('info', 'Info')),
    h('span', { class: 'status' }),
    h('button', { type: 'button', class: 'button primary save', onclick: save }, 'Save'),
    h('a', { href: config.siteUrl, target: '_blank' }, 'Site ↗'),
    h('button', { type: 'button', class: 'link', onclick: logout }, 'Log out'));
}

function updateBar() {
  const status = document.querySelector('.bar .status');
  const saveBtn = document.querySelector('.bar .save');
  if (status) status.textContent = state.status;
  if (saveBtn) saveBtn.disabled = !state.dirty;
}

function render() {
  const views = { projects: projectsView, project: projectView, home: homeView, archive: archiveView, info: infoView };
  app.replaceChildren(bar(), h('main', { class: 'admin-main' }, views[state.view]()));
  updateBar();
}

// ---------- Save ----------
function mediaPaths(data) {
  const paths = new Set();
  const add = (m) => { if (m?.src) paths.add(m.src); if (m?.poster) paths.add(m.poster); };
  for (const p of data.projects) { add(p.cover); p.media.forEach(add); }
  data.home.slides.forEach(add);
  (data.archive ?? []).forEach(add);
  return paths;
}

function validate() {
  const slugs = new Set();
  for (const p of state.data.projects) {
    if (!p.title.trim()) return 'Every project needs a title.';
    if (!p.slug) return `"${p.title}" needs a slug.`;
    if (slugs.has(p.slug)) return `Two projects use the slug "${p.slug}". Slugs must be unique.`;
    if (!p.cover) return `"${p.title}" needs a cover image.`;
    slugs.add(p.slug);
  }
  return null;
}

async function save() {
  const problem = validate();
  if (problem) { alert(problem); return; }

  const saveBtn = document.querySelector('.bar .save');
  saveBtn.disabled = true;
  state.status = 'Saving…';
  updateBar();

  try {
    if (await state.repo.fileSha(config.dataPath) !== state.sha) {
      throw new Error('The content was changed somewhere else since you opened the admin. Copy any text you need, then reload the page.');
    }

    const used = mediaPaths(state.data);
    const uploads = [...state.pending].filter(([path]) => used.has(path))
      .map(([path, file]) => ({ path, base64: file.base64 }));
    const removed = [...mediaPaths(state.saved)]
      .filter((path) => !used.has(path) && path.startsWith('images/'))
      .map((path) => ({ path, delete: true }));
    const text = `${JSON.stringify(state.data, null, 2)}\n`;

    const shas = await state.repo.commit(
      [...uploads, { path: config.dataPath, text }, ...removed],
      'Update content from admin',
    );

    state.sha = shas[config.dataPath];
    state.saved = clone(state.data);
    state.pending.clear();
    state.dirty = false;
    state.status = 'Saved. The site updates in 1–2 minutes.';
  } catch (err) {
    state.status = 'Not saved';
    alert(`Saving failed: ${err.message}`);
  }
  updateBar();
}

// ---------- Login ----------
function loginView(message) {
  const token = h('input', { type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', required: true });
  app.replaceChildren(h('main', { class: 'login' },
    h('h1', {}, 'ILANA TSCHIPTSCHIN — Admin'),
    message && h('p', { class: 'error' }, message),
    h('form', {
      onsubmit: (e) => { e.preventDefault(); start(token.value.trim()); },
    },
      field('GitHub access token', token),
      h('button', { class: 'button primary' }, 'Log in')),
    h('details', {},
      h('summary', {}, 'How do I get a token?'),
      h('ol', {},
        h('li', {}, 'Open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank' }, 'GitHub → New fine-grained token'), '.'),
        h('li', {}, 'Name it "Website admin" and pick an expiration (e.g. 1 year).'),
        h('li', {}, `Repository access: Only select repositories → ${config.owner}/${config.repo}.`),
        h('li', {}, 'Permissions → Repository permissions → Contents: Read and write.'),
        h('li', {}, 'Generate, copy the token and paste it here. It stays in this browser only.')))));
}

async function start(token) {
  if (!token) return loginView();
  app.replaceChildren(h('main', { class: 'login' }, h('p', {}, 'Loading…')));
  const repo = new Repo({ ...config, token });
  try {
    await repo.verify();
    const { text, sha } = await repo.readFile(config.dataPath);
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
    Object.assign(state, { repo, sha, data: JSON.parse(text), view: 'projects', dirty: false, status: '' });
    state.saved = clone(state.data);
    render();
  } catch (err) {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    loginView(err.status === 401 ? 'That token is not valid or has expired.' : err.message);
  }
}

function logout() {
  if (state.dirty && !confirm('You have unsaved changes. Log out anyway?')) return;
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  state.dirty = false;
  loginView();
}

addEventListener('beforeunload', (e) => {
  if (state.dirty) e.preventDefault();
});

let savedToken = '';
try { savedToken = localStorage.getItem(TOKEN_KEY) || ''; } catch {}
start(savedToken);
