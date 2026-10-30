// Builds an <img> or <video> from a media item: { type, src, alt, poster }.
export function createMedia(item, { eager = false } = {}) {
  if (item.type === 'video') {
    const video = document.createElement('video');
    video.src = item.src;
    if (item.poster) video.poster = item.poster;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('aria-label', item.alt || '');
    return video;
  }
  const img = document.createElement('img');
  img.src = item.src;
  img.alt = item.alt || '';
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  return img;
}

// Fades elements in as they scroll into view.
export function revealOnScroll(elements) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  elements.forEach((el) => {
    el.classList.add('reveal');
    io.observe(el);
  });
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
