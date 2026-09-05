param(
    [string]$WorkbookPath = ".\data\raw\wa_perinatal_dashboard.xlsx",
    [string]$CountyGeoJsonPath = ".\data\raw\wa_counties.geojson",
    [string]$OutputDirectory = ".\data\processed"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression

function Get-ZipEntryText($Zip, [string]$Name) {
    $entry = $Zip.Entries | Where-Object FullName -eq $Name
    if (-not $entry) { throw "Missing XLSX component: $Name" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Get-CellValue($Cell, $SharedStrings) {
    $value = [string]$Cell.v
    if ($Cell.t -eq "s" -and $value -ne "") {
        return $SharedStrings[[int]$value]
    }
    return $value
}

$workbook = (Resolve-Path $WorkbookPath).Path
$zip = [IO.Compression.ZipFile]::OpenRead($workbook)
try {
    [xml]$sharedXml = Get-ZipEntryText $zip "xl/sharedStrings.xml"
    $sharedStrings = @()
    foreach ($item in $sharedXml.sst.si) {
        if ($null -ne $item.t) {
            $sharedStrings += [string]$item.t
        } else {
            $sharedStrings += (($item.r | ForEach-Object { [string]$_.t }) -join "")
        }
    }

    [xml]$sheet = Get-ZipEntryText $zip "xl/worksheets/sheet1.xml"
    $ns = [Xml.XmlNamespaceManager]::new($sheet.NameTable)
    $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

    $medicaidRows = @()
    $healthRows = foreach ($row in $sheet.SelectNodes("//x:sheetData/x:row", $ns)) {
        $cells = @{}
        foreach ($cell in $row.c) {
            $column = ([string]$cell.r) -replace "\d", ""
            $cells[$column] = Get-CellValue $cell $sharedStrings
        }

        if ($cells.A -eq "Postpartum Depression" -and
            $cells.E -eq "ACH" -and
            $cells.G -eq "ALL" -and
            $cells.H -eq "ALL" -and
            $cells.M -eq "Three-Year Rollup" -and
            $cells.N -eq "2021-2023") {
            $estimate = if ($cells.I -eq "") { $null } else { [double]$cells.I }
            [pscustomobject]@{
                ach_name = $cells.F
                indicator = $cells.A
                period = $cells.N
                estimate_proportion = $estimate
                estimate_percent = if ($null -eq $estimate) { $null } else { [math]::Round(100 * $estimate, 1) }
                lower_95_ci_percent = if ($cells.J -eq "") { $null } else { [math]::Round(100 * [double]$cells.J, 1) }
                upper_95_ci_percent = if ($cells.K -eq "") { $null } else { [math]::Round(100 * [double]$cells.K, 1) }
                relative_standard_error = if ($cells.L -eq "") { $null } else { [double]$cells.L }
                reliability_flag = $cells.P
                data_source = $cells.O
            }
        }

        if ($cells.A -eq "Postpartum Depression" -and
            $cells.E -eq "WA" -and
            $cells.G -eq "Medicaid Status" -and
            $cells.M -eq "Three-Year Rollup" -and
            $cells.N -eq "2021-2023") {
            $medicaidRows += [pscustomobject]@{
                coverage_group = $cells.H
                indicator = $cells.A
                period = $cells.N
                estimate_percent = [math]::Round(100 * [double]$cells.I, 1)
                lower_95_ci_percent = [math]::Round(100 * [double]$cells.J, 1)
                upper_95_ci_percent = [math]::Round(100 * [double]$cells.K, 1)
                relative_standard_error = [double]$cells.L
                data_source = $cells.O
            }
        }
    }
} finally {
    $zip.Dispose()
}

if ($healthRows.Count -ne 9) {
    throw "Expected 9 ACH health rows; found $($healthRows.Count)."
}
if ($medicaidRows.Count -ne 2) {
    throw "Expected 2 Medicaid-status rows; found $($medicaidRows.Count)."
}

# The workbook uses the dashboard display names current when these estimates
# were released. Each county is assigned to exactly one of the nine regions.
$countyToAch = @{
    Adams="Better Health Together"; Ferry="Better Health Together"; Lincoln="Better Health Together"; PendOreille="Better Health Together"; Spokane="Better Health Together"; Stevens="Better Health Together"
    Cowlitz="Cascade Pacific Action Alliance"; GraysHarbor="Cascade Pacific Action Alliance"; Lewis="Cascade Pacific Action Alliance"; Mason="Cascade Pacific Action Alliance"; Pacific="Cascade Pacific Action Alliance"; Thurston="Cascade Pacific Action Alliance"; Wahkiakum="Cascade Pacific Action Alliance"
    Pierce="Elevate Health"
    Asotin="Greater Health Now"; Benton="Greater Health Now"; Columbia="Greater Health Now"; Franklin="Greater Health Now"; Garfield="Greater Health Now"; Kittitas="Greater Health Now"; WallaWalla="Greater Health Now"; Whitman="Greater Health Now"; Yakima="Greater Health Now"
    King="Healthier Here"
    Island="North Sound"; SanJuan="North Sound"; Skagit="North Sound"; Snohomish="North Sound"; Whatcom="North Sound"
    Clallam="Olympic Community of Health"; Jefferson="Olympic Community of Health"; Kitsap="Olympic Community of Health"
    Clark="Southwest Washington"; Klickitat="Southwest Washington"; Skamania="Southwest Washington"
    Chelan="Thriving Together NCW"; Douglas="Thriving Together NCW"; Grant="Thriving Together NCW"; Okanogan="Thriving Together NCW"
}

$countyGeo = Get-Content $CountyGeoJsonPath -Raw | ConvertFrom-Json
$featuresByAch = @{}
foreach ($healthRow in $healthRows) { $featuresByAch[$healthRow.ach_name] = [Collections.ArrayList]::new() }

foreach ($feature in $countyGeo.features) {
    $key = ([string]$feature.properties.JURLBL) -replace "[\s-]", ""
    $ach = $countyToAch[$key]
    if (-not $ach) { throw "No ACH assignment for county: $($feature.properties.JURLBL)" }
    [void]$featuresByAch[$ach].Add($feature)
}

$assignedCount = ($featuresByAch.Values | ForEach-Object Count | Measure-Object -Sum).Sum
if ($assignedCount -ne 39) { throw "Expected 39 assigned counties; found $assignedCount." }

$achFeatures = foreach ($healthRow in ($healthRows | Sort-Object ach_name)) {
    $parts = [Collections.ArrayList]::new()
    $countyNames = [Collections.ArrayList]::new()
    foreach ($countyFeature in $featuresByAch[$healthRow.ach_name]) {
        [void]$countyNames.Add([string]$countyFeature.properties.JURLBL)
        if ($countyFeature.geometry.type -eq "Polygon") {
            [void]$parts.Add($countyFeature.geometry.coordinates)
        } elseif ($countyFeature.geometry.type -eq "MultiPolygon") {
            foreach ($polygon in $countyFeature.geometry.coordinates) { [void]$parts.Add($polygon) }
        } else {
            throw "Unexpected county geometry type: $($countyFeature.geometry.type)"
        }
    }

    [ordered]@{
        type = "Feature"
        properties = [ordered]@{
            ach_name = $healthRow.ach_name
            counties = (($countyNames | Sort-Object) -join ", ")
            county_count = $countyNames.Count
        }
        geometry = [ordered]@{
            type = "MultiPolygon"
            coordinates = $parts.ToArray()
        }
    }
}

$outputPath = New-Item -ItemType Directory -Force -Path $OutputDirectory
$healthRows | Sort-Object ach_name | Export-Csv (Join-Path $outputPath "postpartum_depression_ach_2021_2023.csv") -NoTypeInformation -Encoding utf8
$medicaidRows | Sort-Object coverage_group | Export-Csv (Join-Path $outputPath "postpartum_depression_medicaid_2021_2023.csv") -NoTypeInformation -Encoding utf8
[ordered]@{ type="FeatureCollection"; name="Washington Accountable Communities of Health"; features=@($achFeatures) } |
    ConvertTo-Json -Depth 100 -Compress |
    Set-Content (Join-Path $outputPath "wa_ach_boundaries.geojson") -Encoding utf8

Write-Output "Created $($healthRows.Count) health rows and $($achFeatures.Count) ACH features."
