# Washington postpartum depression mapping data

## Recommended files

- `processed/postpartum_depression_ach_2021_2023.csv`: Washington PRAMS estimate of postpartum depression for each Accountable Community of Health (ACH), using the latest common three-year rollup in the downloaded workbook. `estimate_percent` is the field to map. `*` in `reliability_flag` means a wide confidence interval; `**` means suppressed, with the estimate left blank.
- `processed/wa_ach_boundaries.geojson`: nine ACH features in WGS 84 longitude/latitude. Join it to the CSV with the exact string field `ach_name`.
- `processed/postpartum_depression_medicaid_2021_2023.csv`: statewide PRAMS estimates by Medicaid and non-Medicaid status. This is a demographic comparison, not an ACH-level association.

The public PRAMS geography is ACH rather than county. This scale protects survey respondents and provides sufficiently large regional samples. The 2021–2023 rollup is preferable to single-year estimates for mapping because it is the latest common regional period and is less unstable.

## Sources

- Health workbook: Washington State Department of Health, Perinatal Dashboard data download, downloaded September 5, 2026: https://doh.wa.gov/data-and-statistical-reports/washington-tracking-network-wtn/perinatal-data/dashboard
- Base boundaries: Washington State Department of Transportation county boundary Feature Service, downloaded as GeoJSON in WGS 84: https://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/CountyBoundaries/FeatureServer/0
- Region definitions/names: Washington State Health Care Authority, Accountable Communities of Health: https://www.hca.wa.gov/about-hca/programs-and-initiatives/medicaid-transformation-project-mtp/accountable-communities-health-achs

The ACH GeoJSON is a derived boundary layer. It groups the official state county polygons according to the ACH assignment used by the DOH health data. Its `MultiPolygon` geometry retains the authoritative county coordinate rings; it does not invent or interpolate boundaries.

## Raw and reproducibility files

- `raw/wa_perinatal_dashboard.xlsx`: unmodified DOH workbook.
- `raw/wa_counties.geojson`: unmodified WSDOT query result.
- `../scripts/prepare_postpartum_ach_data.ps1`: reproducible extraction and aggregation script.

Important interpretation: the PRAMS values are weighted survey estimates, not administrative counts or diagnosed cases. Regional differences are descriptive and do not establish that place or any mapped contextual factor causes postpartum depression.
