import { getSiteData } from './data.js';
import { el } from './media.js';

const root = document.querySelector('.info-page');

// Each section is a column: grey label, then a list of entries
// ({ year?, text, href? }), the same layout as the project info.
function render(data) {
  for (const section of data.info.sections) {
    const col = el('div');
    const list = el('ul');
    for (const item of section.items) {
      const li = el('li');
      if (item.year) li.append(el('p', null, item.year));
      const text = el(item.href ? 'a' : 'p', null, item.text);
      if (item.href) text.href = item.href;
      li.append(text);
      list.append(li);
    }
    col.append(el('h2', 'bold', section.label), list);
    root.append(col);
  }
}

getSiteData().then(render).catch(console.error);
