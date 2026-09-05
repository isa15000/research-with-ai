const DATA_URL="data/processed/postpartum_depression_ach_2021_2023.csv",GEO_URL="data/processed/wa_ach_boundaries.geojson",STATE_ESTIMATE=11;
const colorFor=v=>v==null||Number.isNaN(v)?"#a9aeab":v<10.5?"#f5dfb0":v<12?"#e4a84d":v<14?"#e66d55":"#a72f3f";
const escapeHtml=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);

async function loadData(){
  const [rows,geojson]=await Promise.all([d3.csv(DATA_URL),d3.json(GEO_URL)]);
  rows.forEach(row=>["estimate_percent","lower_95_ci_percent","upper_95_ci_percent","relative_standard_error"].forEach(key=>row[key]=row[key]===""?null:+row[key]));
  const byName=new Map(rows.map(row=>[row.ach_name,row]));
  geojson.features.forEach(feature=>Object.assign(feature.properties,byName.get(feature.properties.ach_name)));
  return{rows,geojson};
}
function popupHtml(p){
  const missing=p.estimate_percent==null,estimate=missing?"Suppressed":`${Number(p.estimate_percent).toFixed(1)}%`;
  const interval=missing?"No public estimate":`95% CI ${Number(p.lower_95_ci_percent).toFixed(1)}–${Number(p.upper_95_ci_percent).toFixed(1)}%`;
  const caution=p.reliability_flag==="*"?" · Wide interval":"";
  return `<div class="popup-region"><div class="popup-kicker">Accountable Community of Health</div><h3>${escapeHtml(p.ach_name)}</h3><div class="popup-estimate">${estimate}</div><div class="popup-meta">${interval}${caution}</div><div class="popup-counties"><strong>Counties:</strong> ${escapeHtml(p.counties)}</div></div>`;
}
function buildMap(geojson){
  const status=document.getElementById("map-status");
  const map=new maplibregl.Map({container:"map",style:"https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",center:[-120.8,47.35],zoom:5.35,minZoom:4.5,maxZoom:10,attributionControl:false});
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");map.addControl(new maplibregl.AttributionControl({compact:true}));
  // Add the research layer as soon as the basemap style is ready. Waiting for
  // MapLibre's full `load` event can leave the overlay blocked by slow tiles.
  map.once("style.load",()=>{
    map.addSource("ach",{type:"geojson",data:geojson,generateId:true});
    map.addLayer({id:"ach-fill",type:"fill",source:"ach",paint:{"fill-color":["case",["==",["get","estimate_percent"],null],"#a9aeab",["step",["to-number",["get","estimate_percent"]],"#f5dfb0",10.5,"#e4a84d",12,"#e66d55",14,"#a72f3f"]],"fill-opacity":["case",["boolean",["feature-state","hover"],false],.9,.72]}});
    map.addLayer({id:"ach-outline",type:"line",source:"ach",paint:{"line-color":"#fffdfa","line-width":1.5,"line-opacity":.95}});
    let hoveredId=null;
    map.on("mousemove","ach-fill",event=>{map.getCanvas().style.cursor="pointer";if(hoveredId!==null)map.setFeatureState({source:"ach",id:hoveredId},{hover:false});hoveredId=event.features[0].id;map.setFeatureState({source:"ach",id:hoveredId},{hover:true})});
    map.on("mouseleave","ach-fill",()=>{map.getCanvas().style.cursor="";if(hoveredId!==null)map.setFeatureState({source:"ach",id:hoveredId},{hover:false});hoveredId=null});
    map.on("click","ach-fill",event=>new maplibregl.Popup({maxWidth:"290px"}).setLngLat(event.lngLat).setHTML(popupHtml(event.features[0].properties)).addTo(map));
    status.hidden=true;
  });
  map.on("error",event=>{if(!map.loaded())status.textContent="The basemap could not load. Run with Live Server and check your internet connection.";console.error(event.error)});
}
function buildChart(rows){
  const visible=rows.filter(d=>d.estimate_percent!=null).sort((a,b)=>d3.descending(a.estimate_percent,b.estimate_percent));
  const labels=new Map([["Cascade Pacific Action Alliance","Cascade Pacific"],["Olympic Community of Health","Olympic"],["Better Health Together","Better Health Together"],["Greater Health Now","Greater Health Now"],["Southwest Washington","Southwest Washington"],["Healthier Here","Healthier Here"],["North Sound","North Sound"],["Elevate Health","Elevate Health"]]);
  const width=980,margin={top:24,right:70,bottom:48,left:210},rowHeight=48,height=margin.top+margin.bottom+visible.length*rowHeight;
  const svg=d3.select("#chart").append("svg").attr("viewBox",`0 0 ${width} ${height}`).attr("role","img");svg.append("title").text("Regional postpartum depression estimates with 95 percent confidence intervals");
  const x=d3.scaleLinear().domain([0,25]).range([margin.left,width-margin.right]),y=d3.scaleBand().domain(visible.map(d=>d.ach_name)).range([margin.top,height-margin.bottom]).padding(.42);
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).ticks(5).tickFormat(d=>`${d}%`)).call(g=>g.select(".domain").remove());
  svg.append("g").attr("class","axis").attr("transform",`translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d=>labels.get(d))).call(g=>g.select(".domain").remove());
  svg.append("line").attr("x1",x(STATE_ESTIMATE)).attr("x2",x(STATE_ESTIMATE)).attr("y1",margin.top-8).attr("y2",height-margin.bottom).attr("stroke","#7f8581").attr("stroke-dasharray","4 4");
  svg.append("text").attr("x",x(STATE_ESTIMATE)+5).attr("y",margin.top-10).attr("fill","#626a65").attr("font-size",11).text("Washington 11.0%");
  const groups=svg.selectAll(".estimate-row").data(visible).join("g").attr("class","estimate-row");
  groups.append("line").attr("x1",d=>x(d.lower_95_ci_percent)).attr("x2",d=>x(d.upper_95_ci_percent)).attr("y1",d=>y(d.ach_name)+y.bandwidth()/2).attr("y2",d=>y(d.ach_name)+y.bandwidth()/2).attr("stroke","#244b40").attr("stroke-width",2);
  groups.append("circle").attr("cx",d=>x(d.estimate_percent)).attr("cy",d=>y(d.ach_name)+y.bandwidth()/2).attr("r",6).attr("fill",d=>colorFor(d.estimate_percent)).attr("stroke","#fffdfa").attr("stroke-width",2);
  groups.append("text").attr("x",d=>x(d.upper_95_ci_percent)+8).attr("y",d=>y(d.ach_name)+y.bandwidth()/2+4).attr("fill","#202523").attr("font-size",12).attr("font-weight",700).text(d=>`${d.estimate_percent.toFixed(1)}%${d.reliability_flag==="*"?" *":""}`);
}
loadData().then(({rows,geojson})=>{buildMap(geojson);buildChart(rows)}).catch(error=>{document.getElementById("map-status").textContent="Data could not load. Open the project through Live Server rather than as a file.";document.getElementById("chart").textContent="Chart data could not load.";console.error(error)});
