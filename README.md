# Ilana Tschiptschin — portfolio

A static site with no build step and no dependencies: plain HTML, CSS and JavaScript modules.

## Run locally

The pages load their content from `data/site.json`, so they need a local server (opening the files directly won't work):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Admin (editing content)

The admin is **not published** with the site (`_config.yml` excludes it): a public page asking for
a GitHub token looks like phishing to browsers. Open it from your own computer instead:
download the `admin` folder and double-click `admin/index.html`.

Log in with a GitHub fine-grained token that has **Contents: Read and write** on this repository
only (the login page explains how to create one). From there you can:

- add, edit, reorder and delete projects, with cover, images/videos (full or half width) and alt text
- choose the homepage slideshow
- fill the Archive: upload many images at once, drag to reorder, optional title/year/categories/project link
- edit the Info page sections and entries

**Save** writes everything in one commit to the branch in `admin/config.js` (the branch GitHub Pages
publishes from). The site updates 1–2 minutes later. Photos are resized to max 2400px and saved as
JPEG; videos are uploaded as they are (max 50 MB, compressed MP4 recommended). Files no longer used
by any project or slide are removed from the repository on save (they stay in git history).

## Structure

| File | Page |
|---|---|
| `index.html` + `js/home.js` | Intro animation and slideshow of selected images and videos |
| `work.html` + `js/work.js` | Two-column grid of all projects, with category filter (`?category=branding`) |
| `project.html` + `js/project.js` | Single project (`?p=<slug>`): cover, 5-column info (incl. credits), full/half gallery, Previous/Next, Close |
| `archive.html` + `js/archive.js` | Archive: 4-column wall of images with filters; opens a lightbox, or the project if linked |
| `info.html` + `js/info.js` | Info page: sections (About, Awards, …) in the same columns as the project info |
| `css/style.css` | All styles. One font size (`--fs`), black and grey |
| `js/data.js` | The **only** place content is loaded from. Point it at the API when the backend is built |
| `data/site.json` | All content: categories, homepage slides, info page, projects |
| `admin/` | The admin: `admin.js` (interface), `github.js` (saving to GitHub), `files.js` (image resizing), `config.js` (repo + branch) |

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
  "info": {
    "sections": [
      // one column per section; year and href are optional
      { "label": "Awards", "items": [{ "year": "2019", "text": "it’s a book\n…" }] },
      { "label": "Contact", "items": [{ "text": "…@gmail.com", "href": "mailto:…@gmail.com" }] }
    ]
  },
  "archive": [
    // project: optional slug; when set, the image links to that project instead of the lightbox
    { "type": "image", "src": "images/archive/…jpg", "title": "Contravento 9", "year": "2018", "categories": ["editorial"], "project": "" }
  ],
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
