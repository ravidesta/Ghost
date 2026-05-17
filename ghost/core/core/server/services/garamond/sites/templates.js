// # Site templates
//
// Handlebars source for the static author/series/book pages. Kept as
// strings (not separate .hbs files) so the renderer is dependency-free —
// no asset pipeline, no theme loader, no edge cases at deploy time.
//
// Templates share a single layout that loads the Garamond font pairing
// chosen by the author. The look is intentionally close to the
// GaramondReader's typography so the marketing site and the reading
// experience feel like the same product.

const LAYOUT = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{title}}</title>
{{#if description}}<meta name="description" content="{{description}}" />{{/if}}
<meta property="og:title" content="{{title}}" />
{{#if description}}<meta property="og:description" content="{{description}}" />{{/if}}
{{#if ogImage}}<meta property="og:image" content="{{ogImage}}" />{{/if}}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={{urlencodeFont headingFont}}:wght@400;600;700&family={{urlencodeFont bodyFont}}:wght@400;600;700&display=swap" />
<style>
  :root {
    --bg: #F4ECD8;
    --fg: #5B4636;
    --accent: #8B5E3C;
    --rule: #D9CDB4;
    --heading-font: "{{headingFont}}", serif;
    --body-font: "{{bodyFont}}", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); font-family: var(--body-font); line-height: 1.6; }
  a { color: var(--accent); text-decoration: underline; text-underline-offset: 0.2em; }
  h1, h2, h3 { font-family: var(--heading-font); line-height: 1.15; letter-spacing: -0.01em; margin-top: 1.8em; }
  h1 { font-size: 2.6em; }
  h2 { font-size: 1.9em; }
  h3 { font-size: 1.35em; }
  main { max-width: 70ch; margin: 0 auto; padding: 4rem 1.5rem 8rem; }
  header.site { border-bottom: 1px solid var(--rule); padding: 1.4rem 1.5rem; }
  header.site .inner { max-width: 70ch; margin: 0 auto; display: flex; justify-content: space-between; align-items: baseline; }
  header.site a { text-decoration: none; }
  .author-name { font-family: var(--heading-font); font-size: 1.1em; letter-spacing: 0.04em; }
  nav.site a { margin-left: 1rem; font-size: 0.95em; }
  .book-card, .series-card { border-top: 1px solid var(--rule); padding: 1.5rem 0; display: flex; gap: 1.5rem; }
  .book-card img, .series-card img { width: 100px; height: 150px; object-fit: cover; flex-shrink: 0; background: var(--rule); }
  .book-card .meta, .series-card .meta { flex: 1; }
  .book-card h3, .series-card h3 { margin: 0 0 0.25em 0; font-size: 1.3em; }
  .book-card .price { font-family: var(--heading-font); font-size: 0.95em; color: var(--accent); margin-top: 0.4em; }
  .buy { display: inline-block; padding: 0.7em 1.5em; background: var(--accent); color: var(--bg); text-decoration: none; border-radius: 999px; font-weight: 600; margin-top: 1.5em; }
  .buy:hover { opacity: 0.9; }
  .footer-mark { margin-top: 6rem; padding-top: 1.5rem; border-top: 1px solid var(--rule); font-size: 0.85em; opacity: 0.6; text-align: center; }
  .cover-hero { display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2rem; }
  .cover-hero img { width: 220px; height: 330px; object-fit: cover; background: var(--rule); }
  .cover-hero .info { flex: 1; }
  .cover-hero h1 { margin-top: 0; }
  .series-position { font-size: 0.9em; opacity: 0.7; margin-bottom: 0.5em; text-transform: uppercase; letter-spacing: 0.12em; }
  .prose p { margin: 1em 0; }
  .prose p:first-of-type::first-letter { font-family: var(--heading-font); font-size: 3.4em; float: left; line-height: 0.9; padding: 0.05em 0.08em 0 0; color: var(--accent); }
</style>
</head>
<body>
<header class="site">
  <div class="inner">
    <a class="author-name" href="/">{{author.name}}</a>
    <nav class="site">
      <a href="/">Home</a>
      <a href="/books/">Books</a>
      {{#if hasSeries}}<a href="/series/">Series</a>{{/if}}
    </nav>
  </div>
</header>
<main>
{{{body}}}
</main>
<div class="footer-mark">
  Published with Garamond &middot; <a href="https://garamond.example/">garamond.example</a>
</div>
</body>
</html>
`;

const AUTHOR_HOME = `
<h1>{{author.name}}</h1>
{{#if author.bio}}<div class="prose"><p>{{author.bio}}</p></div>{{/if}}

{{#if series.length}}
<h2>Series</h2>
{{#each series}}
<a class="series-card" href="/series/{{slug}}/">
  {{#if cover_image}}<img src="{{cover_image}}" alt="" />{{else}}<img alt="" />{{/if}}
  <div class="meta">
    <h3>{{name}}</h3>
    {{#if description}}<p>{{description}}</p>{{/if}}
  </div>
</a>
{{/each}}
{{/if}}

<h2>Books</h2>
{{#each books}}
<a class="book-card" href="/books/{{slug}}/">
  {{#if cover_image}}<img src="{{cover_image}}" alt="" />{{else}}<img alt="" />{{/if}}
  <div class="meta">
    <h3>{{title}}</h3>
    {{#if subtitle}}<p>{{subtitle}}</p>{{/if}}
    {{#if price_cents}}<div class="price">{{formatPrice price_cents currency}}</div>{{/if}}
  </div>
</a>
{{/each}}
`;

const BOOK_PAGE = `
<div class="cover-hero">
  {{#if book.cover_image}}<img src="{{book.cover_image}}" alt="Cover of {{book.title}}" />{{else}}<img alt="" />{{/if}}
  <div class="info">
    {{#if book.series_position}}<div class="series-position">Book {{book.series_position}}{{#if series}} of {{series.name}}{{/if}}</div>{{/if}}
    <h1>{{book.title}}</h1>
    {{#if book.subtitle}}<h2 style="margin-top:0; font-size:1.3em; opacity:0.8;">{{book.subtitle}}</h2>{{/if}}
    {{#if book.price_cents}}
      <p class="price" style="margin-top:1em;">{{formatPrice book.price_cents book.currency}}</p>
      <a class="buy" href="{{checkoutUrl}}">Buy now</a>
    {{else}}
      <a class="buy" href="{{readUrl}}">Read</a>
    {{/if}}
  </div>
</div>

{{#if book.description}}
<div class="prose"><p>{{book.description}}</p></div>
{{/if}}
`;

const SERIES_PAGE = `
<h1>{{series.name}}</h1>
{{#if series.description}}<div class="prose"><p>{{series.description}}</p></div>{{/if}}

{{#each books}}
<a class="book-card" href="/books/{{slug}}/">
  {{#if cover_image}}<img src="{{cover_image}}" alt="" />{{else}}<img alt="" />{{/if}}
  <div class="meta">
    {{#if series_position}}<div class="series-position">Book {{series_position}}</div>{{/if}}
    <h3>{{title}}</h3>
    {{#if subtitle}}<p>{{subtitle}}</p>{{/if}}
    {{#if price_cents}}<div class="price">{{formatPrice price_cents ../seriesCurrency}}</div>{{/if}}
  </div>
</a>
{{/each}}
`;

const BOOKS_INDEX = `
<h1>Books</h1>
{{#each books}}
<a class="book-card" href="/books/{{slug}}/">
  {{#if cover_image}}<img src="{{cover_image}}" alt="" />{{else}}<img alt="" />{{/if}}
  <div class="meta">
    <h3>{{title}}</h3>
    {{#if subtitle}}<p>{{subtitle}}</p>{{/if}}
    {{#if price_cents}}<div class="price">{{formatPrice price_cents currency}}</div>{{/if}}
  </div>
</a>
{{/each}}
`;

const SERIES_INDEX = `
<h1>Series</h1>
{{#each series}}
<a class="series-card" href="/series/{{slug}}/">
  {{#if cover_image}}<img src="{{cover_image}}" alt="" />{{else}}<img alt="" />{{/if}}
  <div class="meta">
    <h3>{{name}}</h3>
    {{#if description}}<p>{{description}}</p>{{/if}}
  </div>
</a>
{{/each}}
`;

module.exports = {
    LAYOUT,
    AUTHOR_HOME,
    BOOK_PAGE,
    SERIES_PAGE,
    BOOKS_INDEX,
    SERIES_INDEX
};
