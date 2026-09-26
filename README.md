# Postpartum Healthcare Utilization Across Washington State

An update to the existing “After Birth, Across Washington” dashboard. The research question concerns receipt of a maternal postpartum checkup across geography and insurance groups. The original typography, colors, cards, ACH map, and responsive layout are retained.

## Current data status

The local DOH workbook contains no postpartum-checkup variable. Both new CSVs are intentionally header-only. The map shows neutral ACH boundaries; chart areas explicitly identify the missing data. No percentages, years, insurance groups, or findings have been inferred from the previous outcome.

See [data requirements](data/README.md) for exactly what to request and how to populate the templates. After supplying verified data, review the page narrative, years, population definition, methods, and limitations before presenting; the current text accurately describes the pending-data state.

## Run locally

Serve this directory over HTTP, for example with the VS Code Live Server extension, and open index.html. Local CSV/GeoJSON fetches require an HTTP server. Internet access is needed for MapLibre, D3, Google Fonts, and the CARTO basemap. Library, data, and map failures have visible fallback messages.

## Structure

- index.html — research narrative, sections, sources, and static missing-data states.
- styles.css — original visual design plus missing-data and accessible table styles.
- app.js — validated checkup CSV loading, ACH map/popups, reusable CI dot plots, and accessible tables.
- data/processed/postpartum_checkup_ach.csv — empty geographic checkup template.
- data/processed/postpartum_checkup_insurance.csv — empty insurance checkup template.
- data/README.md — inventory, provenance, schema, and acquisition instructions.
- scripts/prepare_postpartum_ach_data.ps1 — preserved legacy extraction for the previous outcome; does not generate checkup data.
- .github/workflows/pages.yml — existing deployment workflow, unchanged.

## Preservation and publication

Raw data, geographic files, legacy CSVs, and the original preparation script remain unchanged. The site no longer loads legacy outcome CSVs. Nothing has been published, pushed, or merged. The existing GitHub Pages workflow deploys when main is pushed; only do that when publication is intended.

## Source citation corrections

The supplied JAMA links identify Interrante et al. (2022) and Saldanha et al. (2023), rather than Daw and Gordon. The dashboard uses the authors shown on those linked articles.
