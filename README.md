# Ilana Tschiptschin — portfolio

A static site with no build step and no dependencies: plain HTML, CSS and JavaScript modules.

## Run locally

The pages load their content from `data/site.json`, so they need a local server (opening the files directly won't work):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Structure

| File | Page |
|---|---|
| `index.html` + `js/home.js` | Intro animation and slideshow of selected images and videos |
| `work.html` + `js/work.js` | Two-column grid of all projects, with category filter (`?category=branding`) |
| `project.html` + `js/project.js` | Single project (`?p=<slug>`): cover, 5-column info (incl. credits), full/half gallery, Previous/Next, Close |
| `info.html` | Info page (placeholder text) |
| `css/style.css` | All styles. One font size (`--fs`), black and grey |
| `js/data.js` | The **only** place content is loaded from. Point it at the API when the backend is built |
| `data/site.json` | All content: categories, homepage slides, projects |

## Content model (`data/site.json`)

```jsonc
{
  "categories": [{ "id": "branding", "label": "Branding" }],
  "home": {
    "slides": [
      // type: "image" | "video". Videos play to the end, then the next slide shows
      { "project": "lumen-festival", "type": "image", "src": "images/...", "alt": "" }
    ]
  },
  "projects": [
    {
      "slug": "lumen-festival",           // used in the URL
      "title": "Lumen Festival",
      "year": 2025,
      "categories": ["art-direction", "branding"],   // one or more category ids
      "location": "São Paulo, BR",
      "description": "…",
      "credits": "Photography: …\nDevelopment: …",   // line breaks with \n
      "cover": { "type": "image", "src": "…", "alt": "…" },
      "media": [
        { "type": "image", "src": "…", "alt": "", "width": "full" },  // "full" | "half"
        { "type": "video", "src": "….mp4", "poster": "….jpg", "width": "half" }
      ]
    }
  ]
}
```

Project order in the array is the order on the Work page and for Previous / Next.
Images in `images/projects/` are grey placeholders; replace them with real work.
