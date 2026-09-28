# Postpartum Healthcare Utilization Across Washington State

An update to the existing “After Birth, Across Washington” dashboard. The research question concerns receipt of a maternal postpartum checkup across geography and insurance groups. The original typography, colors, cards, ACH map, and responsive layout are retained.

## Current data status

The local DOH workbook contains no ACH-level postpartum-checkup variable, so the map remains a neutral boundary reference and the two comparison templates remain header-only. The page now includes two verified statewide data elements: Washington's 2023 PRAMS benchmark (91% attended a postpartum visit within 12 weeks) and 60 monthly CMS observations of postpartum visits among female Medicaid and CHIP beneficiaries ages 15–44 during 2018–2022.

See [data requirements](data/README.md) for provenance, measure distinctions, and what is still needed for direct ACH and insurance-group comparisons.

## Run locally

Serve this directory over HTTP, for example with the VS Code Live Server extension, and open index.html. Local CSV/GeoJSON fetches require an HTTP server. Internet access is needed for MapLibre, D3, Google Fonts, and the CARTO basemap. Library, data, and map failures have visible fallback messages.

## Structure

- index.html — research narrative, statewide benchmark, regional data status, methods, and sources.
- styles.css — original visual design plus missing-data and accessible table styles.
- app.js — validated CSV loading, ACH map/popups, accessible tables, and CMS Medicaid trend chart.
- data/processed/cms_wa_medicaid_postpartum_visits_2018_2022.csv — 60 monthly Washington CMS observations.
- data/processed/postpartum_checkup_ach.csv — empty geographic checkup template.
- data/processed/postpartum_checkup_insurance.csv — empty insurance checkup template.
- data/README.md — inventory, provenance, schema, and acquisition instructions.
- scripts/prepare_postpartum_ach_data.ps1 — preserved legacy extraction for the previous outcome; does not generate checkup data.
- scripts/prepare_cms_postpartum_visits.ps1 — reproducibly filters and formats the CMS series.
- .github/workflows/pages.yml — existing deployment workflow, unchanged.

## Preservation and publication

Raw data, geographic files, legacy CSVs, and the original preparation script remain available. The GitHub Pages workflow deploys updates whenever `main` is pushed.

## Source citation corrections

The supplied JAMA links identify Interrante et al. (2022) and Saldanha et al. (2023), rather than Daw and Gordon. The dashboard uses the authors shown on those linked articles.
