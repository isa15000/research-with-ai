# Washington postpartum-checkup data

## Inventory and audit

All local data files were inspected before the dashboard update.

- raw/wa_perinatal_dashboard.xlsx: original DOH workbook, downloaded September 5, 2026 per the original project documentation. One worksheet, 4,828 rows including headings/notes. Its indicator inventory contains no maternal postpartum-checkup measure. No checkup row was found by searching cell values for postpartum/checkup wording.
- raw/wa_counties.geojson: 39 WSDOT county boundary features, geometry only.
- processed/wa_ach_boundaries.geojson: nine derived ACH MultiPolygon features, with ach_name, counties, and county_count; no utilization estimates.
- processed/postpartum_depression_ach_2021_2023.csv: preserved legacy PRAMS outcome, nine ACH rows for 2021–2023, including one suppressed estimate and two unreliable estimates.
- processed/postpartum_depression_medicaid_2021_2023.csv: preserved legacy statewide Medicaid / Non-Medicaid comparison for 2021–2023. These categories are NOT confirmed for checkup data.
- ../scripts/prepare_postpartum_ach_data.ps1: preserved legacy extraction and county-to-ACH boundary aggregation. It is not a checkup extraction script. Its old insurance numeric conversion should not be reused for new data because blanks can become zero.

No original dataset was deleted or overwritten. References were checked; the site now loads only the new checkup CSVs and the existing ACH geometry.

## Exactly what to obtain

Request a Washington State Department of Health / Washington PRAMS public aggregate export for the indicator **Had maternal postpartum checkup**, among people who recently had a live birth and participated in PRAMS:

1. Estimates for each ACH, for one common source-published year or pooled period.
2. A separate statewide table for that same outcome and preferably the same period, by the exact source-defined insurance categories.
3. Weighted percentages, available lower/upper 95% confidence limits, suppression status, reliability flags and their definitions, and any source notes.
4. Question wording, denominator/exclusions, postpartum reference window, insurance coverage timing (for example at delivery versus at survey), survey weighting documentation, source URL, and release/download date.

Availability of this specific ACH export has not been established. Contact Washington PRAMS if it is not in the public download. Do not substitute national estimates, the legacy outcome, or county geometry for missing checkup estimates. If DOH provides only statewide figures, leave the regional map as a placeholder. If geography differs from the existing ACH definitions, obtain a compatible boundary layer and revise the join explicitly.

Separate geographic and insurance tables cannot explain one another. An association within regions would require an authorized, reliable ACH-by-insurance checkup cross-tabulation or suitable survey microdata and a separate analytical plan.

## Templates and fields

The two new CSVs contain headers only: no fabricated observations or example numbers.

- processed/postpartum_checkup_ach.csv: use exact ach_name strings from processed/wa_ach_boundaries.geojson.
- processed/postpartum_checkup_insurance.csv: use exact coverage_group labels from the new source; include geography (for example Washington State, if statewide) and coverage_timing.

Common fields:

| Field | Meaning |
| --- | --- |
| indicator | Had maternal postpartum checkup; exact expected outcome label |
| period | Actual source year or pooled years; required |
| estimate_percent | Source estimate on a 0–100 percentage scale; blank if unavailable |
| lower_95_ci_percent, upper_95_ci_percent | Source 95% CI in percent; blank when absent |
| reliability_flag | Preserve source marker; * means unreliable and ** suppressed under the legacy DOH convention |
| suppression_status | reported, missing, suppressed, or blank; translate any other source suppression convention explicitly |
| reliability_note | Preserve source explanation, especially if flags differ from the legacy convention |
| data_source | Source attribution; required |
| source_url | Specific dataset/source URL; required |

Keep the original export separately and document any indicator-label mapping. If the source uses proportions, multiply by 100 consistently for estimates and CI bounds; do not alter the denominator. Preserve original precision in the CSV; display is rounded to one decimal place. Never enter 0 for a blank or suppressed observation. Both suppression_status=suppressed and reliability_flag=** prevent display of numeric estimates/intervals.

The loader rejects missing required columns, wrong outcomes, duplicate groups, mixed periods, unknown ACH names, or mixed insurance geography/timing. Non-numeric/out-of-range values remain unavailable. CI lines require both endpoints and a valid ordering around the estimate. Source order is preserved; charts do not rank areas. All rows, including suppressed and missing values, appear in accessible tables.

Before presenting populated data, update pending-data prose in index.html, including the hero, interpretation, methods, limitations, and footer. Confirm source flag definitions, source question/population, years, geographic compatibility, and coverage timing. Record the new provenance here. The current narrative intentionally reflects the actual missing-data state.

## Provenance and reference links

- [Washington DOH Perinatal Dashboard](https://doh.wa.gov/data-and-statistical-reports/washington-tracking-network-wtn/perinatal-data/dashboard): original workbook source, not a confirmed checkup download.
- [Washington PRAMS](https://doh.wa.gov/data-statistical-reports/health-behaviors/pregnancy-risk-assessment-monitoring-system): primary program for data/documentation requests.
- [CDC PRAMS](https://www.cdc.gov/prams/): survey resources.
- [WSDOT County Boundaries](https://data.wsdot.wa.gov/ArcGIS/rest/services/Shared/CountyBoundaries/FeatureServer/0): original county geometry in WGS 84.
- [Washington HCA ACH definitions](https://www.hca.wa.gov/about-hca/programs-and-initiatives/medicaid-transformation-project-mtp/accountable-communities-health-achs): regional definitions. The derived map retains the county rings and assignments used in the existing project.
- [Interrante et al. (2022)](https://jamanetwork.com/journals/jama-health-forum/fullarticle/2797463): related research on postpartum care, insurance, geography, race and ethnicity.
- [Saldanha et al. (2023)](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2805510): systematic review of insurance and postpartum outcomes.

The linked academic articles are context, not Washington ACH estimates. Their authors differ from the names originally supplied in the change request. All comparisons here are descriptive; group differences do not establish causation.
