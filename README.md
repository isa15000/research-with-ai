# After Birth, Across Washington

Interactive research webpage showing 2021–2023 postpartum depression estimates across Washington's Accountable Communities of Health.

## Run locally

Open this folder in Visual Studio Code, install the **Live Server** extension if needed, right-click `index.html`, and choose **Open with Live Server**. The page must be served over HTTP because it fetches the local CSV and GeoJSON at runtime.

An internet connection is required for MapLibre GL JS, D3.js, Google Fonts, and the grayscale CARTO Positron vector basemap. The research data themselves are stored in `data/processed/`.

## Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the site whenever `main` is pushed. In the repository on GitHub, open **Settings → Pages**, set **Source** to **GitHub Actions**, and run the workflow (or push to `main`). The expected project URL is:

https://isa15000.github.io/research-with-ai/

## Structure

- `index.html` — main research page
- `styles.css` — responsive page and visualization styling
- `app.js` — data join, MapLibre map, popup interaction, and D3 chart
- `data/README.md` — data provenance, preparation choices, and limitations
- `scripts/prepare_postpartum_ach_data.ps1` — reproducible data preparation
