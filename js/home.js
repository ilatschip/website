import { getSiteData, projectUrl } from './data.js';
import { createMedia } from './media.js';

const IMAGE_DURATION = 4000;
const INTRO_KEY = 'intro-seen';

// ---------- Intro: counts 0–100% in the header's name position while the first
// slide loads, turns into the name, then the white fades away to the slideshow ----------
const COUNT_MS = 1600;   // minimum time from 0 to 100

function firstSlideReady() {
  return new Promise((resolve) => {
    const check = () => {
      const media = document.querySelector('.slideshow .slide img, .slideshow .slide video');
      if (!media) return requestAnimationFrame(check);
      if (media.tagName === 'VIDEO' ? media.readyState >= 2 : media.complete) return resolve();
      media.addEventListener(media.tagName === 'VIDEO' ? 'loadeddata' : 'load', resolve, { once: true });
      media.addEventListener('error', resolve, { once: true });
    };
    check();
    setTimeout(resolve, 8000); // never hold the page longer than this
  });
}

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

  const counter = intro.querySelector('.intro__count');
  let loaded = false;
  firstSlideReady().then(() => { loaded = true; });

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      counter.textContent = 'ILANA TSCHIPTSCHIN';
      try { sessionStorage.setItem(INTRO_KEY, '1'); } catch {}
      setTimeout(() => {
        intro.classList.add('is-done');
        setTimeout(() => intro.remove(), 900);
        resolve();
      }, 500);
    };
    const start = performance.now();
    const tick = (now) => {
      if (done) return;
      const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      const eased = 1 - (1 - t) ** 2;   // steady count, slowing towards 100
      // hold at 99 until the first slide is actually there
      const value = Math.round(eased * 100);
      counter.textContent = `${loaded ? value : Math.min(value, 99)}%`;
      if (t >= 1 && loaded) return setTimeout(finish, 300);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
