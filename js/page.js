// The page: a dark stage with neon gradients. Hero, vocal reel, covers
// (K-pop first, then musical theatre duets), originals, dance, about, contact.
import { html, reel, vocalReel, socials, representation } from "./components.js";

const card = (v) => html`<figure class="e-card">
  ${reel({ title: v.title, video: v.video, poster: v.poster, duration: v.duration, posterPosition: v.posterPosition || "50% 40%" })}
  <figcaption><span class="e-card__title">${v.title}</span><span class="e-card__artist">${v.artist}${v.note ? html` · <em>${v.note}</em>` : ""}</span></figcaption>
</figure>`;

const soon = (text) => html`<p class="e-soon">${text}</p>`;

export default function page(c) {
  const p = c.person;
  const kpop = c.covers.items.filter((x) => x.kpop);
  const theatre = c.covers.items.filter((x) => !x.kpop);
  return html`
  <section class="e-hero" id="top">
    <nav class="e-nav wrap"><a href="#top" class="e-logo" aria-label="Home">EVE</a><span class="e-nav__links"><a href="#reel">Reel</a><a href="#covers">Covers</a><a href="#originals">Originals</a><a href="#dance">Dance</a><a href="#about">About</a><a href="#contact">Contact</a></span></nav>
    <div class="e-hero__in wrap">
      <div class="e-hero__text">
        <p class="e-eyebrow">${c.hero.eyebrow}</p>
        <h1 class="e-name">${p.firstName}<br><span>${p.lastName}</span></h1>
        <p class="e-tag">${c.hero.tagline}</p>
        <p class="e-sub">${c.hero.subline}</p>
      </div>
      <figure class="e-hero__photo"><img src="${c.images.hero}" alt="${p.fullName}"></figure>
    </div>
    <div class="e-marquee" aria-hidden="true"><span>${kpop.map((k) => `${k.artist.split(" · ")[0]} ✦ `).join("").repeat(3)}</span></div>
  </section>

  <section class="e-reel wrap" id="reel">
    <div class="e-head"><h2 class="e-label">${c.reel.title}</h2><p class="e-kicker">${c.reel.description}</p></div>
    ${reel(c.reel, { variant: "e-glow" })}
  </section>

  <section class="e-covers" id="covers">
    <div class="wrap">
      <div class="e-head"><h2 class="e-label">${c.covers.title}</h2><p class="e-kicker">K-pop</p></div>
      <div class="e-grid">${kpop.map(card)}</div>
      ${theatre.length ? html`<div class="e-head e-head--sub"><h3 class="e-label e-label--sm">Musical theatre</h3><p class="e-kicker">Duets with her mom, Laura Colten</p></div>
      <div class="e-grid">${theatre.map(card)}</div>` : ""}
    </div>
  </section>

  <section class="e-orig wrap" id="originals">
    <div class="e-head"><h2 class="e-label">${c.music.title}</h2><p class="e-kicker">${c.music.description}</p></div>
    ${vocalReel(c, { variant: "e-music" })}
  </section>

  <section class="e-dance wrap" id="dance">
    <div class="e-head"><h2 class="e-label">${c.dance.title}</h2><p class="e-kicker">${c.dance.description}</p></div>
    ${c.dance.items.length ? html`<div class="e-grid">${c.dance.items.map(card)}</div>` : soon("Dance videos coming soon")}
  </section>

  <section class="e-about" id="about">
    <div class="e-about__in wrap">
      <figure class="e-about__photo"><img src="${c.images.about}" alt="" loading="lazy"></figure>
      <div>
        <h2 class="e-label">About ${p.firstName}</h2>
        ${c.about.paragraphs.map((x) => html`<p>${x}</p>`)}
      </div>
    </div>
  </section>

  <footer class="e-foot" id="contact">
    <div class="e-foot__in wrap">
      <div><h2 class="e-label">Contact</h2>${c.representation.note ? html`<p class="e-foot__note">${c.representation.note}</p>` : ""}</div>
      <div class="e-foot__col">${representation(c)}</div>
      <div class="e-foot__col"><p>${p.location}</p></div>
      ${socials(c, "socials e-foot__socials")}
    </div>
  </footer>`;
}
