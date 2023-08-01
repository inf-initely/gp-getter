// @deno-types="./leaflet.d.ts"
import * as L from 'https://cdn.skypack.dev/leaflet'
// @deno-types="./geojson.d.ts"
// import { FeatureCollection } from 'https://www.unpkg.com/geojson@0.5.0/geojson.min.js'

interface FeatureCollection {
  type: 'FeatureCollection'
  crs: {
    type: 'name'
    properties: {
      name: 'EPSG:4326'
    }
  }
  features: {
    type: 'Feature'
    properties: {
      PROVNO: '73'
    }
    geometry: {
      type: 'Polygon'
      coordinates: [number, number, 0, null][][]
    }
  }[]
}

async function main() {
  const GeoData: Record<string, FeatureCollection> = JSON.parse(
    await fetch('geojson/sulsel.json').then(v => v.text())
  )
  const TheMap = L.map('map').setView([-5.7467629784272125, 120.48323730909578], 13)

  L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: 'pk.eyJ1IjoicmFuZG9tdXBsb2FkZXIiLCJhIjoiY2t2aG9tb2l3Y2N2cTJ2bW4yNWxha2pjdSJ9.x3E4UtAq0fPFzQ_NaIi6ow'
  }).addTo(TheMap)

  for(const [code, entry] of Object.entries(GeoData)) {
    // omit unnecessary entries to save RAM. 
    // index (-4) === 2 === desa
    // if(code.charAt(-4) !== '2') continue

    L.geoJSON(entry, {
      style: {
        color: 'red',
        fillColor: 'red'
      }
    }).addTo(TheMap)
  }
}

main()