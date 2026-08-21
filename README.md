# Niola Lounge

A cinematic, Arabic-first website for Niola Lounge in Zamalek, Cairo. Built with React, Vite, GSAP, Lenis, and React Router.

## Run locally

```bash
npm install
cp .env.example .env   # fill in the Supabase URL and anon key
npm run dev
```

The menu and gallery come from Supabase at runtime; without a `.env` the site renders the copies
in `src/data` instead. See [supabase/README.md](supabase/README.md) for the schema and for how to
edit the menu.

Production checks:

```bash
npm run lint
npm run build
```

## Routes

- `/` — cinematic Niola experience, menu categories, Nile view, shisha, and location
- `/menu` — bilingual editorial menu with a sticky category navigator

Arabic is the default language. The language selector switches the entire interface to English and persists the choice in `localStorage`.

## Media

The website uses the supplied Niola media under `public/images`. The hero keeps a static responsive image beneath the background video so autoplay failures never produce an empty frame. Below-the-fold imagery is lazy loaded.

The web logo at `public/images/logo/niola-logo.png` is reproducibly extracted from the supplied Illustrator PDF with:

```bash
node scripts/extract-logo.mjs
```
