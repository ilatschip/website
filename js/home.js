import { getSiteData, projectUrl } from './data.js';
import { createMedia } from './media.js';

const IMAGE_DURATION = 4000;
const INTRO_KEY = 'intro-seen';

// ---------- Intro: name types in letter by letter, then fades out ----------
function playIntro() {
  const intro = document.querySelector('.intro');
  if (!intro) return Promise.resolve();

  let seen = false;
  try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; } catch {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || reduced) {
    intro.remove();
    return Promise.resolve();
  }

  const name = intro.querySelector('.intro__name');
  const text = name.textContent;
  name.textContent = '';
  name.setAttribute('aria-label', text);
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.setAttribute('aria-hidden', 'true');
    span.style.animationDelay = `${i * 55}ms`;
    name.append(span);
  });

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      intro.classList.add('is-done');
      try { sessionStorage.setItem(INTRO_KEY, '1'); } catch {}
      setTimeout(() => intro.remove(), 900);
      resolve();
    };
    const timer = setTimeout(finish, text.length * 55 + 1100);
    intro.addEventListener('click', finish, { once: true });
  });
}

// ---------- Slideshow: crossfades images; videos play to the end ----------
async function initSlideshow() {
  const root = document.querySelector('.slideshow');
  const caption = document.querySelector('.slideshow__caption');
  const counter = document.querySelector('.slideshow__counter');
  const data = await getSiteData();
  const slides = data.home.slides;
  if (!slides.length) return;

  const nodes = slides.map((item, i) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    const media = createMedia(item, { eager: i === 0 });
    if (media.tagName === 'VIDEO') { media.loop = false; media.autoplay = false; }
    slide.append(media);
    root.append(slide);
    return slide;
  });

  let index = -1;
  let timer;

  function show(i) {
    clearTimeout(timer);
    nodes[index]?.classList.remove('is-active');
    nodes[index]?.querySelector('video')?.pause();

    index = (i + slides.length) % slides.length;
    const item = slides[index];
    const slide = nodes[index];
    slide.classList.add('is-active');

    const project = data.projects.find((p) => p.slug === item.project);
    caption.textContent = item.caption || project?.title || '';
    caption.href = project ? projectUrl(project.slug) : '#';
    counter.textContent = `${index + 1}/${slides.length}`;

    const video = slide.querySelector('video');
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      video.onended = () => show(index + 1);
    } else {
      timer = setTimeout(() => show(index + 1), IMAGE_DURATION);
    }
  }

  root.addEventListener('click', (e) => {
    const { left, width } = root.getBoundingClientRect();
    show(e.clientX - left < width / 3 ? index - 1 : index + 1);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });

  show(0);
}

initSlideshow().catch(console.error);
playIntro();
