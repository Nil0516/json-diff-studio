# JSON Diff Studio

A React + TypeScript frontend project for comparing two JSON payloads side by side.

## Features

- Highlight value, structure, added, and removed differences
- Optional case-insensitive key matching
- Traditional Chinese, Simplified Chinese, English, Japanese, and Korean UI
- Client-side persistence with `localStorage`
- Ready for GitHub Pages deployment

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

This project is configured with `base: '/json-diff/'` in `vite.config.ts`.
If your repository name is different, update that value before deploying.
