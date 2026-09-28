// The templates deliberately contain headers only. Supply verified Washington
// PRAMS checkup data following data/README.md; never reuse another outcome.
const DATA_URL = "data/processed/wa_county_postpartum_mss_2024.csv";
const INSURANCE_URL = "data/processed/postpartum_checkup_insurance.csv";
const CMS_MEDICAID_URL = "data/processed/cms_wa_medicaid_postpartum_visits_2018_2022.csv";
const GEO_URL = "data/raw/wa_counties.geojson";
const OUTCOME = "Received postpartum Maternity Support Services";
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
const percent = value => value == null ? "Not available" : `${value.toFixed(1)}%`;

// Blank, suppressed, and nonnumeric values must never become zero.
function numeric(value) {
  const text = String(value ?? "").trim();
  if (!text || !/^\d+(\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return number >= 0 && number <= 100 ? number : null;
}
function normalize(row) {
  const result = {...row};
  result.suppressed = row.suppression_status === "suppressed" || row.reliability_flag === "**";
  for (const key of ["estimate_percent", "lower_95_ci_percent", "upper_95_ci_percent"]) {
    result[key] = result.suppressed || row.suppression_status === "missing" ? null : numeric(row[key]);
  }
  return result;
}
function hasInterval(row) {
  return row.estimate_percent != null && row.lower_95_ci_percent != null &&
    row.upper_95_ci_percent != null && row.lower_95_ci_percent <= row.estimate_percent &&
    row.upper_95_ci_percent >= row.estimate_percent;
}
function statusText(row) {
  if (row.suppressed) return "Suppressed by source";
  if (row.estimate_percent == null) return "Checkup estimate not available";
  return percent(row.estimate_percent);
}
function intervalText(row) {
  return hasInterval(row)
    ? `95% CI ${percent(row.lower_95_ci_percent)}–${percent(row.upper_95_ci_percent)}`
    : "95% CI not available";
}
function reliabilityText(row) {
  return [row.reliability_flag === "*" ? "Unreliable estimate; interpret cautiously" :
    row.reliability_flag === "**" ? "Suppressed estimate" : row.reliability_flag,
    row.reliability_note].filter(Boolean).join(" · ") || "No reliability note supplied";
}
async function loadRows(url, key) {
  const raw = await d3.csv(url);
  const required = ["indicator", key, "period", "estimate_percent", "lower_95_ci_percent",
    "upper_95_ci_percent", "reliability_flag", "suppression_status", "reliability_note",
    "data_source", "source_url"];
  if (key === "coverage_group") required.push("coverage_timing", "geography");
  if (required.some(field => !raw.columns.includes(field))) throw new Error("Incomplete CSV schema");
  const seen = new Set();
  const rows = raw.map(row => {
    if (row.indicator !== OUTCOME || !row[key]?.trim() || !row.period?.trim() ||
        !row.data_source?.trim() || !row.source_url?.trim() || seen.has(row[key])) {
      throw new Error("Check indicator, source, period, and unique group names");
    }
    if (key === "coverage_group" && (!row.coverage_timing?.trim() || !row.geography?.trim())) {
      throw new Error("Insurance geography and timing are required");
    }
    if (!["", "reported", "missing", "suppressed"].includes(row.suppression_status)) {
      throw new Error("Unrecognized suppression status");
    }
    seen.add(row[key]);
    return normalize(row);
  });
  // One comparable source-defined period per chart; never silently pool rows.
  if (new Set(rows.map(row => row.period)).size > 1 ||
      (key === "coverage_group" && (new Set(rows.map(row => row.geography)).size > 1 ||
      new Set(rows.map(row => row.coverage_timing)).size > 1))) {
    throw new Error("Mixed comparison periods or insurance definitions");
  }
  return rows;
}
function popupHtml(row) {
  return `<div class="popup-region"><div class="popup-kicker">Washington county · 2024</div>
    <h3>${escapeHtml(row.county_name)}</h3><div class="popup-estimate">${escapeHtml(statusText(row))}</div>
    <div class="popup-meta">Period: ${escapeHtml(row.period || "Not supplied")}<br>
    ${escapeHtml(intervalText(row))}<br>${escapeHtml(reliabilityText(row))}</div>
    <div class="popup-counties"><strong>Postpartum MSS clients:</strong> ${escapeHtml(row.postpartum_mss_count || "Suppressed")}<br><strong>Medicaid perinatal population:</strong> ${escapeHtml(row.medicaid_perinatal_count || "Suppressed")}</div></div>`;
}
function buildMap(geojson) {
  const status = document.getElementById("map-status");
  if (!window.maplibregl) {
    status.textContent = "The map library could not load. Regional data status is listed below.";
    return;
  }
  let map;
  try {
    map = new maplibregl.Map({
      container:"map", style:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center:[-120.8,47.35], zoom:5.35, minZoom:4.5, maxZoom:10, attributionControl:false
    });
  } catch {
    status.textContent = "The interactive map is unavailable in this browser. See regional data status below.";
    return;
  }
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
  map.addControl(new maplibregl.AttributionControl({compact:true}));
  let ready = false;
  const timeout = setTimeout(() => {
    if (!ready) status.textContent = "Map loading is delayed. Check your connection; regional data status is available below.";
  }, 15000);
  map.once("style.load", () => {
    map.addSource("ach",{type:"geojson",data:geojson,generateId:true});
    map.addLayer({id:"ach-fill",type:"fill",source:"ach",paint:{
      "fill-color":["case",["==",["get","estimate_percent"],null],"#a9aeab",
        ["interpolate",["linear"],["get","estimate_percent"],0,"#f5dfb0",35,"#e4a84d",55,"#e66d55",70,"#a72f3f"]],
      "fill-opacity":["case",["boolean",["feature-state","hover"],false],.9,.72]
    }});
    map.addLayer({id:"ach-outline",type:"line",source:"ach",
      paint:{"line-color":"#fffdfa","line-width":1.5,"line-opacity":.95}});
    let hoveredId = null;
    const hover = new maplibregl.Popup({closeButton:false,closeOnClick:false,maxWidth:"290px"});
    map.on("mousemove","ach-fill",event => {
      const feature = event.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = "pointer";
      if (hoveredId !== null) map.setFeatureState({source:"ach",id:hoveredId},{hover:false});
      hoveredId = feature.id;
      map.setFeatureState({source:"ach",id:hoveredId},{hover:true});
      hover.setLngLat(event.lngLat).setHTML(popupHtml(feature.properties)).addTo(map);
    });
    map.on("mouseleave","ach-fill",() => {
      map.getCanvas().style.cursor = "";
      if (hoveredId !== null) map.setFeatureState({source:"ach",id:hoveredId},{hover:false});
      hoveredId = null;
      hover.remove();
    });
    map.on("click","ach-fill",event => {
      hover.remove();
      if (event.features?.[0]) new maplibregl.Popup({maxWidth:"290px"})
        .setLngLat(event.lngLat).setHTML(popupHtml(event.features[0].properties)).addTo(map);
    });
    // Fit Washington at both mobile and desktop widths; preserve pan/zoom controls.
    map.fitBounds([[-124.85,45.5],[-116.9,49.05]],{padding:35,duration:0});
    ready = true;
    clearTimeout(timeout);
    status.hidden = true;
  });
  map.on("error",() => {
    if (!ready) status.textContent = "The basemap could not load. Check your internet connection; regional data status is listed below.";
  });
}
function emptyState(selector, message) {
  const container = document.querySelector(selector);
  container.replaceChildren();
  const note = document.createElement("p");
  note.className = "empty-state";
  note.textContent = message;
  container.append(note);
}
function buildTable(selector, rows, key, caption) {
  const wrap = d3.select(selector).append("div").attr("class","data-table-wrap");
  const table = wrap.append("table").attr("class","data-table");
  table.append("caption").text(caption);
  const headings = ["Area / group","Period","Checkup utilization","95% CI","Reliability / status"];
  table.append("thead").append("tr").selectAll("th").data(headings).join("th")
    .attr("scope","col").text(d => d);
  const body = table.append("tbody");
  rows.forEach(row => {
    const tr = body.append("tr");
    tr.append("th").attr("scope","row").text(row[key]);
    [row.period || "Not supplied",statusText(row),intervalText(row),reliabilityText(row)]
      .forEach(value => tr.append("td").text(value));
  });
}
function buildChart(selector, rows, key, title) {
  if (!rows.length) return;
  document.querySelector(selector).replaceChildren();
  const compactCounty = key === "county_name";
  const visible = rows.filter(row => row.estimate_percent != null)
    .sort((a,b)=>d3.descending(a.estimate_percent,b.estimate_percent));
  if (!visible.length) emptyState(selector,"No reportable checkup estimates. Missing and suppressed observations are listed below.");
  else {
    if (compactCounty) {
      const values=visible.map(d=>d.estimate_percent);
      const summary=d3.select(selector).append("div").attr("class","chart-summary");
      [["Highest",`${d3.max(values).toFixed(1)}%`,visible[0].county_name],
       ["Median",`${d3.median(values).toFixed(1)}%`,"Reportable counties"],
       ["Available",`${visible.length} of ${rows.length}`,"County estimates"]].forEach(item=>{
        const card=summary.append("div");card.append("span").text(item[0]);card.append("strong").text(item[1]);card.append("small").text(item[2]);
      });
    }
    const width=980, margin={top:compactCounty?10:18,right:75,bottom:compactCounty?36:44,left:compactCounty?175:245}, rowHeight=compactCounty?20:48;
    const height=margin.top+margin.bottom+visible.length*rowHeight;
    const svg=d3.select(selector).append("div").attr("class","chart-scroll").append("svg")
      .attr("viewBox",`0 0 ${width} ${height}`).attr("role","img");
    svg.append("title").text(title);
    const plotStart=margin.left+(compactCounty?20:0);
    const x=d3.scaleLinear().domain([0,compactCounty?70:100]).range([plotStart,width-margin.right]);
    const y=d3.scaleBand().domain(visible.map(d=>d[key])).range([margin.top,height-margin.bottom]).padding(compactCounty ? .25 : .42);
    svg.append("g").attr("class","axis").attr("transform",`translate(0,${height-margin.bottom})`)
      .call(d3.axisBottom(x).ticks(compactCounty?7:5).tickFormat(d=>`${d}%`)).call(g=>g.select(".domain").remove());
    svg.append("g").attr("class","axis").attr("transform",`translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(0)).call(g=>g.select(".domain").remove());
    const groups=svg.selectAll(".estimate-row").data(visible).join("g").attr("class","estimate-row");
    groups.append("title").text(d=>`${d[key]}: ${statusText(d)}; ${intervalText(d)}; ${d.period}; ${reliabilityText(d)}`);
    groups.filter(hasInterval).append("line")
      .attr("x1",d=>x(d.lower_95_ci_percent)).attr("x2",d=>x(d.upper_95_ci_percent))
      .attr("y1",d=>y(d[key])+y.bandwidth()/2).attr("y2",d=>y(d[key])+y.bandwidth()/2)
      .attr("stroke","#244b40").attr("stroke-width",2);
    groups.append("circle").attr("cx",d=>x(d.estimate_percent)).attr("cy",d=>y(d[key])+y.bandwidth()/2)
      .attr("r",compactCounty?4.5:6).attr("fill","#e66d55").attr("stroke","#fffdfa").attr("stroke-width",compactCounty?1.5:2);
    groups.append("text").attr("x",d=>x(hasInterval(d)?d.upper_95_ci_percent:d.estimate_percent)+8)
      .attr("y",d=>y(d[key])+y.bandwidth()/2+(compactCounty?3.5:4)).attr("font-size",compactCounty?10.5:12)
      .text(d=>`${percent(d.estimate_percent)}${d.reliability_flag==="*"?" *":""}`);
  }
  if (compactCounty) {
    const suppressed=rows.filter(row=>row.estimate_percent==null).map(row=>row.county_name).sort();
    const details=d3.select(selector).append("details").attr("class","suppressed-summary");
    details.append("summary").text(`${suppressed.length} counties unavailable because source components were suppressed`);
    details.append("p").text(suppressed.join(" · "));
  } else buildTable(selector,rows,key,title+" — source order; no ranking");
}
function buildMedicaidTrend(rows) {
  const container=d3.select("#insurance-chart");container.selectAll("*").remove();
  const parseMonth=d3.timeParse("%Y-%m");
  const parsed=rows.filter(d=>d.rate_per_1000_female_beneficiaries!=null).map(d=>({...d,date:d.month instanceof Date?d.month:parseMonth(d.month),rate:+d.rate_per_1000_female_beneficiaries}));
  const width=900,height=390,margin={top:24,right:35,bottom:55,left:65};
  const svg=container.append("div").attr("class","chart-scroll").append("svg").attr("viewBox",`0 0 ${width} ${height}`).attr("role","img");
  svg.append("title").text("Monthly postpartum visits per 1,000 female Medicaid and CHIP beneficiaries ages 15 to 44 in Washington, 2018 through 2022");
  const x=d3.scaleTime().domain(d3.extent(parsed,d=>d.date)).range([margin.left,width-margin.right]);
  const y=d3.scaleLinear().domain([0,d3.max(parsed,d=>d.rate)*1.15]).nice().range([height-margin.bottom,margin.top]);
  svg.append("g").attr("class","axis grid").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(width-margin.left-margin.right))).call(g=>g.select(".domain").remove());
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y"))).call(g=>g.select(".domain").remove());
  svg.append("path").datum(parsed).attr("fill","none").attr("stroke","#e66d55").attr("stroke-width",3).attr("d",d3.line().x(d=>x(d.date)).y(d=>y(d.rate)));
  svg.selectAll(".trend-dot").data(parsed).join("circle").attr("class","trend-dot").attr("cx",d=>x(d.date)).attr("cy",d=>y(d.rate)).attr("r",3).attr("fill","#244b40").append("title").text(d=>`${d3.timeFormat("%Y-%m")(d.date)}: ${d.rate.toFixed(1)} visits per 1,000; ${Number(d.service_count).toLocaleString()} services`);
  svg.append("text").attr("x",margin.left).attr("y",14).attr("font-size",12).attr("fill","#626a65").text("Visits per 1,000 beneficiaries");
  const april=parsed.find(d=>d3.timeFormat("%Y-%m")(d.date)==="2020-04");if(april){svg.append("line").attr("x1",x(april.date)).attr("x2",x(april.date)).attr("y1",y(april.rate)-45).attr("y2",y(april.rate)-7).attr("stroke","#626a65");svg.append("text").attr("x",x(april.date)+6).attr("y",y(april.rate)-34).attr("font-size",11).attr("fill","#626a65").text("April 2020: 14.2")}
}
async function initialize() {
  if (!window.d3) {
    document.getElementById("map-status").textContent = "Visualization library unavailable. Check your internet connection. Checkup data have not yet been supplied.";
    return;
  }
  // Load independently so one missing/malformed dataset cannot disable the others.
  const [regional, insurance, boundaries, medicaidTrend] = await Promise.allSettled([
    loadRows(DATA_URL,"county_name"), loadRows(INSURANCE_URL,"coverage_group"), d3.json(GEO_URL), d3.csv(CMS_MEDICAID_URL,d3.autoType)
  ]);
  let rows = regional.status === "fulfilled" ? regional.value : [];
  const coverage = insurance.status === "fulfilled" ? insurance.value : [];
  let regionalError = regional.status === "rejected";
  if (boundaries.status === "fulfilled") {
    const geojson = boundaries.value;
    geojson.features.forEach(feature=>feature.properties.county_name=feature.properties.JURLBL);
    const names = new Set(geojson.features.map(f=>f.properties.county_name));
    if (rows.some(row=>!names.has(row.county_name))) {
      regionalError = true;
      rows = [];
    }
    const byName = new Map(rows.map(row=>[row.county_name,row]));
    geojson.features.forEach(feature => {
      Object.assign(feature.properties, {estimate_percent:null}, byName.get(feature.properties.county_name));
    });
    buildMap(geojson);
    if (!rows.length) buildTable("#chart",geojson.features.map(f=>f.properties),"county_name","County data unavailable");
  } else document.getElementById("map-status").textContent = "Regional boundaries could not load. Serve this folder over HTTP and check local assets.";
  if (regionalError) emptyState("#chart","Regional checkup data could not be validated or loaded. See data/README.md for the required fields and ACH names.");
  else buildChart("#chart",rows,"county_name","Postpartum Maternity Support Services utilization by county");
  if (medicaidTrend.status === "fulfilled" && medicaidTrend.value.length) buildMedicaidTrend(medicaidTrend.value);
  else emptyState("#insurance-chart","CMS Medicaid postpartum-visit data could not be loaded.");
  if (rows.length) {
    document.getElementById("chart-title").textContent = "Reported postpartum MSS utilization";
    document.querySelector(".chart-key").hidden = !rows.some(row=>row.estimate_percent!=null);
    document.querySelector("#map-section .section-note").textContent = "Select a county for its 2024 estimate, counts, or suppression status.";
    document.getElementById("estimate-legend").hidden = !rows.some(row=>row.estimate_percent!=null);
  }
  if (coverage.length) {
    document.querySelector(".context-copy strong").textContent = "Descriptive comparison";
    document.querySelector("#insurance .section-note").textContent = `${coverage[0].geography}; ${coverage[0].period}. Coverage timing: ${coverage[0].coverage_timing}. Dots show estimates; lines show available 95% confidence intervals.`;
  }
  if (rows.length || coverage.length) {
    document.getElementById("data-coverage").textContent = [
      rows.length ? `ACH checkup period: ${rows[0].period}.` : "ACH checkup data not supplied.",
      coverage.length ? `Insurance: ${coverage.map(row=>row.coverage_group).join(", ")}. Geography: ${coverage[0].geography}; period: ${coverage[0].period}; coverage timing: ${coverage[0].coverage_timing}.` : "Insurance checkup data not supplied."
    ].join(" ");
  }
}
initialize().catch(() => {
  document.getElementById("map-status").hidden = false;
  document.getElementById("map-status").textContent = "Visualizations could not initialize. Check local data files and serve the page over HTTP.";
});
