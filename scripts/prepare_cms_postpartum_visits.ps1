param(
    [string]$InputPath = ".\data\raw\cms_medicaid_perinatal_care.csv",
    [string]$OutputPath = ".\data\processed\cms_wa_medicaid_postpartum_visits_2018_2022.csv"
)

$ErrorActionPreference = "Stop"
$rows = Import-Csv $InputPath | Where-Object {
    $_.State -eq "Washington" -and $_.PerinatalCareType -eq "Postpartum visits"
} | ForEach-Object {
    [pscustomobject]@{
        month = [datetime]::ParseExact($_.Month, "yyyyMM", $null).ToString("yyyy-MM")
        service_count = if ($_.ServiceCount -match '^\d+$') { [int]$_.ServiceCount } else { $null }
        rate_per_1000_female_beneficiaries = if ($_.RatePer1000Beneficiaries -match '^\d+(\.\d+)?$') { [double]$_.RatePer1000Beneficiaries } else { $null }
        data_quality = $_.DataQuality
        geography = "Washington State"
        population = "Female Medicaid and CHIP beneficiaries ages 15–44"
        measure = "Postpartum visits"
        data_source = "CMS T-MSIS Analytic Files"
        source_url = "https://data.medicaid.gov/dataset/ed67e610-aed3-4bed-842f-e6044511dd64"
    }
}

if ($rows.Count -ne 60) { throw "Expected 60 monthly Washington postpartum-visit rows; found $($rows.Count)." }
$rows | Export-Csv $OutputPath -NoTypeInformation -Encoding utf8
Write-Output "Created $($rows.Count) monthly Medicaid postpartum-visit rows."
