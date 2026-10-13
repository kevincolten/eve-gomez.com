// Shared building blocks for the page: templating, reel player, adaptive
// streaming, headshot alignment, icons and the vocal reel.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Tagged template: interpolated strings are escaped, arrays are joined,
// and values wrapped with raw() pass through untouched.
const RAW = Symbol("raw");
export const raw = (s) => ({ [RAW]: String(s) });
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return raw(out);
}
function render(v) {
  if (v == null || v === false) return "";
  if (Array.isArray(v)) return v.map(render).join("");
  if (typeof v === "object" && RAW in v) return v[RAW];
  return esc(v);
}
export const toString = (v) => render(v);

export const featuredCredits = (c) =>
  c.credits.filter((x) => x.featured).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

export const posterSrc = (credit) => `assets/img/posters/${credit.id}.jpg`;

export function poster(credit, { caption = false, meta = false } = {}) {
  return html`<figure class="poster">
    <a href="https://www.imdb.com/title/${credit.id}/" target="_blank" rel="noopener" class="poster__img">
      <img src="${posterSrc(credit)}" alt="${credit.title} poster" loading="lazy">
    </a>
    ${caption ? html`<figcaption class="poster__cap">${credit.shortTitle || credit.title}${
      meta ? html`<span class="poster__meta">${credit.role}${credit.year ? ` · ${credit.year}` : " · Upcoming"}</span>` : ""
    }</figcaption>` : ""}
  </figure>`;
}

// Video block. Shows the poster with a play button; clicking swaps in the
// embed. With no video URL yet it shows the poster and a "coming soon" note.
export function reel(r, { variant = "" } = {}) {
  const has = Boolean(r.video);
  const cls = [r.orientation === "vertical" ? "reel--vertical" : "", variant].filter(Boolean).join(" ");
  return html`<div class="reel ${cls}" data-video="${r.video}" data-title="${r.title}"${r.fallback ? html` data-fallback="${r.fallback}"` : ""}>
    <img class="reel__poster" src="${r.poster}" alt="" style="object-position:${r.posterPosition || "50% 30%"}" loading="lazy">
    <button class="reel__play" type="button" aria-label="Play ${r.title}"${has ? "" : " data-soon"}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
    </button>
    <div class="reel__bar" aria-hidden="true">
      <svg class="reel__icon" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>
      <span class="reel__time">0:00${r.duration ? ` / ${r.duration}` : ""}</span>
      <span class="reel__track"><span></span></span>
      <svg class="reel__icon" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>
      <svg class="reel__icon" viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg>
    </div>
    ${has ? "" : html`<span class="reel__soon">Reel coming soon</span>`}
  </div>`;
}

// Reel with its title and a short line of copy beside it. Set
// orientation: "vertical" on the reel to play it in a 9:16 frame.
export function verticalReel(r, { heading = "" } = {}) {
  return html`<div class="vert${r.orientation === "vertical" ? "" : " vert--wide"}">
    ${reel(r)}
    <div class="vert__copy">
      ${heading}
      ${r.description ? html`<p class="vert__text">${r.description}</p>` : ""}
    </div>
  </div>`;
}

function embedUrl(url) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1${vm[2] ? `&h=${vm[2]}` : ""}`;
  const gd = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  return null;
}

// Adaptive streaming. A reel whose video is an HLS playlist (.m3u8) plays
// through hls.js, which picks the rendition from measured bandwidth and the
// player's on-screen size (so phones never pull 1080p). Safari and iOS play
// HLS natively and adapt on their own. Anything that can't do either gets
// the 720p mp4 that sits next to the playlist.
const HLS_JS = "https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.light.min.js";
let hlsLoader;
const loadHls = () =>
  (hlsLoader ||= new Promise((resolve, reject) => {
    if (window.Hls) return resolve(window.Hls);
    const s = document.createElement("script");
    s.src = HLS_JS;
    s.onload = () => resolve(window.Hls);
    s.onerror = reject;
    document.head.append(s);
  }));

function hlsOptions() {
  const c = navigator.connection || {};
  const slow = c.saveData || /(^|-)2g$/.test(c.effectiveType || "");
  return {
    capLevelToPlayerSize: true,
    startLevel: -1,
    // Seed the bandwidth guess from the browser's own estimate where it has one,
    // so a fast connection starts sharp instead of climbing up from 360p.
    abrEwmaDefaultEstimate: c.downlink ? c.downlink * 1e6 : 2e6,
    maxMaxBufferLength: 30,
    ...(slow ? { autoLevelCapping: 0 } : {}),
  };
}

async function playStream(el, url, fallback) {
  const v = document.createElement("video");
  v.controls = true;
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.title = el.dataset.title;
  const poster = el.querySelector(".reel__poster")?.src;
  if (poster) v.poster = poster;
  el.replaceChildren(v);
  try {
    const Hls = await loadHls();
    if (Hls?.isSupported()) {
      const hls = new Hls(hlsOptions());
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) { hls.destroy(); v.src = fallback; v.play().catch(() => {}); }
      });
      hls.loadSource(url);
      hls.attachMedia(v);
    } else throw new Error("no MSE");
  } catch {
    v.src = v.canPlayType("application/vnd.apple.mpegurl") ? url : fallback;
  }
  v.play().catch(() => {});
}

export function wireReels(root) {
  root.querySelectorAll(".vocal").forEach(wireVocal);
  // Fetch hls.js once a stream scrolls near the screen, so it's ready by the
  // time someone presses play and the tap still counts as the user's gesture.
  const near = "IntersectionObserver" in window && new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { near.disconnect(); loadHls().catch(() => {}); }
  }, { rootMargin: "400px" });
  root.querySelectorAll(".reel").forEach((el) => {
    const url = el.dataset.video;
    if (!url) return;
    if (near && /\.m3u8(\?|$)/.test(url)) near.observe(el);
    el.querySelector(".reel__play").addEventListener("click", () => {
      el.classList.add("is-playing");
      if (/\.m3u8(\?|$)/.test(url)) return playStream(el, url, el.dataset.fallback || url.replace(/[^/]+\.m3u8.*$/, "720p.mp4"));
      const embed = embedUrl(url);
      el.innerHTML = embed
        ? `<iframe src="${esc(embed)}" title="${esc(el.dataset.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
        : `<video src="${esc(url)}" controls autoplay playsinline></video>`;
    });
  });
}

export const ICONS = {
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 3h3a4.5 4.5 0 0 0 4 4v3a7.4 7.4 0 0 1-4-1.2V15a6 6 0 1 1-6-6v3.2a2.8 2.8 0 1 0 3 2.8V3z" fill="currentColor"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>',
  imdb: '<svg viewBox="0 0 40 20" aria-hidden="true"><rect width="40" height="20" rx="3" fill="currentColor"/><text x="20" y="14.5" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="11" fill="var(--imdb-text, #fff)">IMDb</text></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m3.5 7 8.5 6 8.5-6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 6 6.4.6-4.8 4.3 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4-4.8-4.3 6.4-.6z" fill="currentColor"/></svg>',
  film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 8 19.5 3.5l.9 3.4M7 7l2.4-3.2M12 5.6l2.4-3.1M3 12h18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  range: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h8v6a4 4 0 0 1-8 0zm10 4h8v6a4 4 0 0 1-8 0z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 8.5h.01M8.5 8.5h.01M15.5 12.5h.01M18.5 12.5h.01M5.5 12.5q1.5 1.2 3 0M15.5 16.8q1.5-1.2 3 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
};
export const icon = (name) => raw(ICONS[name] || "");

const LABELS = { youtube: "YouTube", imdb: "IMDb", instagram: "Instagram", tiktok: "TikTok", email: "Email" };

export function socials(c, cls = "socials") {
  const items = c.person.socials.filter((s) => s.url);
  return html`<ul class="${cls}">${items.map(
    (s) => html`<li><a href="${s.url}" ${s.type === "email" ? "" : raw('target="_blank" rel="noopener"')} aria-label="${LABELS[s.type] || s.type}">${icon(s.type)}</a></li>`
  )}</ul>`;
}

export function representation(c) {
  const r = c.representation;
  return html`<div class="rep">
    ${r.agency ? html`<p class="rep__agency">${r.agency}</p>` : ""}
    ${r.agent ? html`<p>${r.agent}</p>` : ""}
    ${r.phone ? html`<p>${r.phone}</p>` : ""}
    <p><a href="mailto:${r.email}">${r.email}</a></p>
  </div>`;
}

export const headshots = (c, cls = "shots") =>
  html`<div class="${cls}" data-align>${c.images.headshots.map(
    (h) => html`<figure class="shot"><img src="${h.src}" alt="${h.alt}" loading="lazy"${h.eyes ? html` data-eyes="${h.eyes.join(",")}"` : ""}></figure>`
  )}</div>`;

// Lines up a headshot grid so every face sits at the same height and size:
// each photo is scaled so the gap between the eyes matches across tiles, and
// all the eyes land on one shared line (ideally 40% down the tile) and one
// shared centre. Photos always fill their tile, so if a crop is too tight to
// reach the shared line, everything is scaled up a little until it fits.
const EYE_LINE = 0.4;
const EYE_GAP = 0.17; // of the tile's shorter side, before the fill check

// Range of positions a photo's eye point can take inside the tile while the
// photo still covers it, given the rendered size.
const reach = (tile, size, frac) => [tile - (1 - frac) * size, frac * size];

function layout(items, tw, th, target) {
  const sized = items.map((i) => {
    const s = target / (i.gap * i.W);
    return { ...i, w: i.W * s, h: i.H * s };
  });
  const lo = (axis) => Math.max(...sized.map((i) => (axis === "x" ? reach(tw, i.w, i.x) : reach(th, i.h, i.y))[0]));
  const hi = (axis) => Math.min(...sized.map((i) => (axis === "x" ? reach(tw, i.w, i.x) : reach(th, i.h, i.y))[1]));
  if (lo("x") > hi("x") || lo("y") > hi("y")) return null;
  const ex = Math.min(hi("x"), Math.max(lo("x"), tw / 2));
  const ey = Math.min(hi("y"), Math.max(lo("y"), th * EYE_LINE));
  return sized.map((i) => ({ ...i, left: ex - i.x * i.w, top: ey - i.y * i.h }));
}

function alignGrid(grid) {
  const items = [...grid.querySelectorAll("img[data-eyes]")].map((img) => {
    const [x, y, gap] = img.dataset.eyes.split(",").map(Number);
    return { img, x, y, gap, W: img.naturalWidth, H: img.naturalHeight };
  });
  if (!items.length || items.some((i) => !i.W)) return;
  const tile = items[0].img.parentElement;
  const tw = tile.clientWidth, th = tile.clientHeight;
  if (!tw || !th) return;
  let target = Math.max(EYE_GAP * Math.min(tw, th), ...items.map((i) => i.gap * i.W * Math.max(tw / i.W, th / i.H)));
  let placed = layout(items, tw, th, target);
  for (let n = 0; !placed && n < 40; n++) placed = layout(items, tw, th, (target *= 1.04));
  if (!placed) return;
  for (const i of placed) {
    Object.assign(i.img.style, { width: `${i.w}px`, height: `${i.h}px`, left: `${i.left}px`, top: `${i.top}px` });
    i.img.classList.add("is-aligned");
  }
}

export function alignHeadshots(root) {
  root.querySelectorAll("[data-align]").forEach((grid) => {
    const run = () => alignGrid(grid);
    grid.querySelectorAll("img").forEach((img) => img.complete || img.addEventListener("load", run, { once: true }));
    if ("ResizeObserver" in window) new ResizeObserver(run).observe(grid);
    run();
  });
}

// Vocal reel: singing videos in a grid (each a regular reel player with its
// song title underneath), then audio samples below once there are any.
export function vocalReel(c, { variant = "" } = {}) {
  const m = c.music || { title: "Vocal Reel", videos: [], tracks: [] };
  const videos = m.videos || [];
  return html`<div class="music ${variant}">
    ${videos.length ? html`<div class="clips" data-count="${videos.length}">${videos.map(
      (v) => html`<figure class="clip">
        ${reel({ title: v.title || m.title, video: v.video, duration: v.duration || "", poster: v.poster, posterPosition: v.posterPosition })}
        ${v.title ? html`<figcaption class="clip__title">${v.title}${v.duration ? html`<span>${v.duration}</span>` : ""}</figcaption>` : ""}
        ${v.notes?.length ? html`<ul class="clip__notes">${v.notes.map((n) => html`<li>${n}</li>`)}</ul>` : ""}
      </figure>`
    )}</div>` : ""}
    ${m.tracks?.length ? html`<h3 class="music__sub">Audio samples</h3>${audioPlayer(m)}` : ""}
  </div>`;
}

// Audio samples: player with a waveform and a track list. With no tracks yet
// it shows the player and a "coming soon" note.
function waveBars(n = 96, h = 56) {
  let seed = 7, out = "";
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) {
    const env = 0.35 + 0.65 * Math.abs(Math.sin(i / 9) * Math.cos(i / 23));
    const bh = Math.max(4, Math.round(h * env * (0.45 + 0.55 * r())));
    out += `<rect x="${i * 6 + 1}" y="${(h - bh) / 2}" width="3" height="${bh}" rx="1.5"/>`;
  }
  return `<svg viewBox="0 0 ${n * 6} ${h}" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}

function audioPlayer(m) {
  const tracks = m.tracks || [];
  const wave = raw(waveBars());
  return html`<div class="vocal" data-count="${tracks.length}">
    <div class="vocal__player">
      <button class="vocal__play" type="button" aria-label="Play audio samples"${tracks.length ? "" : " disabled"}>
        <svg class="vocal__icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
        <svg class="vocal__icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>
      </button>
      <div class="vocal__wave">${wave}<div class="vocal__fill">${wave}</div></div>
      <span class="vocal__time">${tracks.length ? tracks[0].duration || "0:00" : ""}</span>
    </div>
    ${tracks.length
      ? html`<ol class="vocal__tracks">${tracks.map(
          (t, i) => html`<li><button type="button" data-i="${i}" data-src="${t.src}"><span>${t.title}</span><span class="vocal__dur">${t.duration}</span></button></li>`
        )}</ol>`
      : html`<p class="vocal__soon">Audio samples coming soon</p>`}
    <audio preload="none"></audio>
  </div>`;
}

function fmt(sec) {
  if (!isFinite(sec)) return "0:00";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function wireVocal(el) {
  const audio = el.querySelector("audio");
  const items = [...el.querySelectorAll(".vocal__tracks button")];
  if (!items.length) return;
  const fill = el.querySelector(".vocal__fill");
  const time = el.querySelector(".vocal__time");
  let current = -1;
  const load = (i) => {
    current = i;
    audio.src = items[i].dataset.src;
    items.forEach((b, j) => b.toggleAttribute("aria-current", j === i));
  };
  const play = (i) => {
    if (i !== current) load(i);
    audio.play();
  };
  el.querySelector(".vocal__play").addEventListener("click", () => {
    if (current < 0) return play(0);
    audio.paused ? audio.play() : audio.pause();
  });
  items.forEach((b, i) => b.addEventListener("click", () => play(i)));
  audio.addEventListener("play", () => el.classList.add("is-playing"));
  audio.addEventListener("pause", () => el.classList.remove("is-playing"));
  audio.addEventListener("timeupdate", () => {
    fill.style.setProperty("--p", `${(audio.currentTime / audio.duration) * 100 || 0}%`);
    time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  });
  audio.addEventListener("ended", () => (current + 1 < items.length ? play(current + 1) : fill.style.setProperty("--p", "0%")));
  el.querySelector(".vocal__wave").addEventListener("click", (e) => {
    if (!audio.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  });
}
