# JSON Diff Studio

JSON Diff Studio is a browser-based JSON diff and JSON compare tool built with React and TypeScript.
It helps users compare two JSON payloads side by side with visual highlights, collapsible nodes, multilingual UI, and client-side persistence.

## Live site

- Production: https://json-diff-studio.dev/
- GitHub Pages fallback: https://nil0516.github.io/json-diff-studio/

## Highlights

- Side-by-side JSON comparison with inline diff highlighting
- Added, removed, changed, and type-changed visual states
- Collapsible JSON objects and arrays for large payloads
- Case-insensitive key comparison toggle
- Traditional Chinese, Simplified Chinese, English, Japanese, and Korean UI
- Local settings persistence with `localStorage`
- Minimap-style diff overview and previous/next diff navigation
- Fully frontend-only deployment with GitHub Pages

## Tech stack

- React 18
- TypeScript
- Vite
- GitHub Actions
- GitHub Pages

## Local development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project structure

```text
src/
  App.tsx        Main UI and interaction flow
  diff.ts        JSON diff logic
  i18n.ts        Locale strings
  storage.ts     localStorage persistence
  styles.css     App styling
public/
  robots.txt
  sitemap.xml
.github/
  workflows/
    deploy.yml   GitHub Pages deployment workflow
```

## Deployment

This project is configured for GitHub Pages deployment through GitHub Actions.

### GitHub Pages

1. Push changes to `main`
2. Make sure `Settings > Pages > Source` is set to `GitHub Actions`
3. GitHub Actions will build and deploy automatically

### Custom domain

The project is currently prepared for:

- `https://json-diff-studio.dev/`

If you change the production domain later, update these files:

- `index.html`
- `public/robots.txt`
- `public/sitemap.xml`

## SEO

The project includes basic SEO setup for discoverability:

- HTML title and meta description
- JSON diff / JSON compare related keywords
- Open Graph metadata
- Twitter metadata
- Canonical URL
- `robots.txt`
- `sitemap.xml`
- structured data via JSON-LD

## Notes

- All JSON comparison happens on the client side
- No backend or database is required
- User preferences and sample content are stored locally in the browser

## License

This project is licensed under the MIT License.
