
import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  LayersControl,
  useMap,
  useMapEvents,
  Polyline,
  Polygon,
  CircleMarker,
  Popup,
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  getMapFeatureInfo,
  getPublicPersilDetail,
  getGovernmentPersilDetail,
} from '../api'

const GEOSERVER_WMS = 'http://localhost:8080/geoserver/landwise/wms'
const WMS_LAYER = 'landwise:v_persil_publik'

const LEGEND_ITEMS = [
  { label: 'Tanah Kosong', color: '#E8C66A' },
  { label: 'Tanah + Bangunan', color: '#4F8C68' },
  { label: 'Fasilitas Umum', color: '#648BC2' },
  { label: 'Kavling Siap Bangun', color: '#D88C55' },
  { label: 'Lahan Pertanian', color: '#91AE55' },
  { label: 'Tidak Diketahui', color: '#A6A6A6' },
]

const PUBLIC_FIELDS = [
  { key: 'luas_tanah_m²', label: 'Luas Tanah (m²)' },
  { key: 'kode_zona', label: 'Kode Zona' },
  { key: 'nilai_znt', label: 'Nilai ZNT' },
  { key: 'penggunaan_tanah', label: 'Penggunaan Tanah' },
  { key: 'penggunaan_bangunan', label: 'Penggunaan Bangunan' },
]

const GOVERNMENT_FIELDS = [
  { key: 'nop', label: 'NOP' },
  { key: 'letak_objek', label: 'Letak Objek' },
  { key: 'nama_wajib_pajak', label: 'Nama Wajib Pajak' },
  { key: 'status_subjek', label: 'Status Subjek' },
  { key: 'pekerjaan', label: 'Pekerjaan' },
  { key: 'alamat_wajib_pajak', label: 'Alamat Wajib Pajak' },
  { key: 'luas_tanah_m²', label: 'Luas Tanah (m²)' },
  { key: 'luas_bangunan_m²', label: 'Luas Bangunan (m²)' },
  { key: 'penggunaan_tanah', label: 'Penggunaan Tanah' },
  { key: 'penggunaan_bangunan', label: 'Penggunaan Bangunan' },
  { key: 'jumlah_objek', label: 'Jumlah Objek' },
  { key: 'kode_zona', label: 'Kode Zona' },
  { key: 'njop_bumi', label: 'NJOP Bumi' },
  { key: 'njop_bangunan', label: 'NJOP Bangunan' },
  { key: 'njop_total', label: 'NJOP Total' },
  { key: 'pbb_terutang', label: 'PBB Terutang' },
  { key: 'nilai_znt', label: 'Nilai ZNT' },
  { key: 'status_pembayaran', label: 'Status Pembayaran' },
]

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem('landwise_user')
    if (!storedUser) return null

    const parsedUser = JSON.parse(storedUser)
    return parsedUser.user || null
  } catch {
    return null
  }
}

function getUserRole(user) {
  return (
    user?.peran ||
    user?.role ||
    user?.nama_peran ||
    user?.data?.peran ||
    user?.data?.role ||
    ''
  ).toString().toUpperCase()
}

function getStoredToken() {
  return localStorage.getItem('landwise_token')
}

function calculatePolygonArea(points) {
  if (points.length < 3) return 0

  const radius = 6378137
  let area = 0

  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]

    const lat1 = current.lat * Math.PI / 180
    const lat2 = next.lat * Math.PI / 180
    const lng1 = current.lng * Math.PI / 180
    const lng2 = next.lng * Math.PI / 180

    area += (lng2 - lng1) *
      (2 + Math.sin(lat1) + Math.sin(lat2))
  }

  return Math.abs(area * radius * radius / 2)
}

function formatArea(area) {
  return `${area.toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  })} m² (${(area / 10000).toLocaleString('id-ID', {
    maximumFractionDigits: 4,
  })} ha)`
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toLocaleString('id-ID', {
      maximumFractionDigits: 3,
    })} km`
  }

  return `${distance.toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  })} m`
}

function calculateDistance(points) {
  if (points.length < 2) return 0

  let total = 0

  for (let i = 1; i < points.length; i++) {
    total += L.latLng(points[i - 1]).distanceTo(
      L.latLng(points[i])
    )
  }

  return total
}

// INTERAKSI PETA
function MapInteraction({
  onSelect,
  measureMode,
  setMeasurePoints,
}) {
  const map = useMap()

  useMapEvents({
    click: async (event) => {
      if (measureMode) {
        setMeasurePoints((previous) => [
          ...previous,
          event.latlng,
        ])
        return
      }

      const position = event.latlng
      const point = map.latLngToContainerPoint(position)
      const size = map.getSize()
      const bounds = map.getBounds()

      onSelect({
        loading: true,
        data: null,
        persilId: null,
        role: null,
        error: null,
        position,
      })

      try {
        const featureInfo = await getMapFeatureInfo({
          bbox: bounds.toBBoxString(),
          width: size.x,
          height: size.y,
          x: Math.round(point.x),
          y: Math.round(point.y),
        })

        if (!featureInfo.found || !featureInfo.persil_id) {
          onSelect({
            loading: false,
            data: null,
            persilId: null,
            role: null,
            error: 'Tidak ada bidang tanah pada lokasi yang dipilih.',
            position,
          })
          return
        }

        const persilId = featureInfo.persil_id
        const user = getStoredUser()
        const role = getUserRole(user)
        const token = getStoredToken()

        let detail

        if (role === 'ADMIN' || role === 'PEMERINTAH') {
          if (!token) {
            throw new Error(
              'Token login tidak ditemukan. Silakan login ulang.'
            )
          }

          detail = await getGovernmentPersilDetail(persilId, token)
        } else if (role === 'MASYARAKAT') {
          detail = await getPublicPersilDetail(persilId)
        } else {
          throw new Error(
            'Peran pengguna tidak dikenali. Silakan login ulang.'
          )
        }

        onSelect({
          loading: false,
          data: detail.data,
          persilId,
          role,
          error: null,
          position,
        })
      } catch (error) {
        onSelect({
          loading: false,
          data: null,
          persilId: null,
          role: null,
          error: error.message || 'Gagal mengambil informasi persil.',
          position,
        })
      }
    },
  })

  return null
}

// TOMBOL LOKASI PENGGUNA
function LocateButton({ onMessage }) {
  const map = useMap()
  const [container, setContainer] = useState(null)

  useEffect(() => {
    setContainer(map.getContainer().parentElement)
  }, [map])

  useMapEvents({
    locationfound: (event) => {
      onMessage(
        `Lokasi ditemukan: ${event.latlng.lat.toFixed(6)}, ${event.latlng.lng.toFixed(6)}`
      )
    },
    locationerror: () => {
      onMessage(
        'Lokasi tidak ditemukan. Periksa izin lokasi browser.'
      )
    },
  })

  if (!container) return null

  return createPortal(
    <button
      type="button"
      className="landwise-locate-button"
      onClick={() => {
        if (!navigator.geolocation) {
          onMessage('Browser tidak mendukung fitur lokasi.')
          return
        }

        onMessage('Sedang mencari lokasi perangkat...')

        map.locate({
          setView: true,
          maxZoom: 17,
          enableHighAccuracy: true,
          timeout: 10000,
        })
      }}
    >
      ⌖ Lokasi Saya
    </button>,
    container
  )
}

// HIGHLIGHT PERSIL TERPILIH
function SelectedPersilLayer({ persilId }) {
  if (!persilId) return null

  const selectionStyle = `
    <StyledLayerDescriptor version="1.0.0"
      xmlns="http://www.opengis.net/sld"
      xmlns:ogc="http://www.opengis.net/ogc">
      <NamedLayer>
        <Name>${WMS_LAYER}</Name>
        <UserStyle>
          <FeatureTypeStyle>
            <Rule>
              <PolygonSymbolizer>
                <Fill>
                  <CssParameter name="fill">#FFD700</CssParameter>
                  <CssParameter name="fill-opacity">0.12</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#FFD700</CssParameter>
                  <CssParameter name="stroke-width">3</CssParameter>
                </Stroke>
              </PolygonSymbolizer>
            </Rule>
          </FeatureTypeStyle>
        </UserStyle>
      </NamedLayer>
    </StyledLayerDescriptor>
  `

  return (
    <WMSTileLayer
      key={persilId}
      url={GEOSERVER_WMS}
      layers={WMS_LAYER}
      format="image/png"
      transparent
      version="1.1.1"
      params={{
        cql_filter: `id=${persilId}`,
        sld_body: selectionStyle,
      }}
      opacity={1}
    />
  )
}

// KONTEN POP-UP INFORMASI PERSIL
function PersilInformationPanel({ selectedPersil, onClose }) {
  const { loading, data, role, error, persilId } = selectedPersil || {}

  const isGovernment =
    role === 'ADMIN' || role === 'PEMERINTAH'

  const fields = isGovernment
    ? GOVERNMENT_FIELDS
    : PUBLIC_FIELDS

  return (
    <div className="landwise-info-panel">
      <div className="landwise-info-header">
        <div>
          <span className="landwise-info-eyebrow">LANDWISE</span>
          <h3>Informasi Persil</h3>
        </div>

        <button
          type="button"
          className="landwise-info-close"
          onClick={onClose}
          aria-label="Tutup informasi persil"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="landwise-info-status">
          <div className="landwise-loading" />
          <p>Memuat informasi bidang tanah...</p>
        </div>
      )}

      {error && !loading && (
        <div className="landwise-info-error">
          <strong>Informasi tidak tersedia</strong>
          <p>{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="landwise-info-content">
          <div className="landwise-info-summary">
            <span>ID Persil</span>
            <strong>#{persilId}</strong>
          </div>

          <div className="landwise-info-role">
            Akses: {role}
          </div>

          <div className="landwise-info-fields">
            <h4>Detail Bidang Tanah</h4>

            {fields.map((field) => {
              const value = data[field.key]

              if (
                value === null ||
                value === undefined ||
                value === ''
              ) {
                return null
              }

              return (
                <div
                  className="landwise-info-row"
                  key={field.key}
                >
                  <span>{field.label}</span>
                  <strong>{String(value)}</strong>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// KOMPONEN UTAMA PETA
function PetaMap() {
  const [selectedPersil, setSelectedPersil] = useState(null)
  const [measureMode, setMeasureMode] = useState(null)
  const [measurePoints, setMeasurePoints] = useState([])
  const [opacity, setOpacity] = useState(100)
  const [locationMessage, setLocationMessage] = useState('')

  const distance = useMemo(
    () => calculateDistance(measurePoints),
    [measurePoints]
  )

  const area = useMemo(
    () => calculatePolygonArea(measurePoints),
    [measurePoints]
  )

  const startMeasure = (mode) => {
    setMeasurePoints([])
    setMeasureMode(mode)
    setSelectedPersil(null)
  }

  const stopMeasure = () => {
    setMeasureMode(null)
    setMeasurePoints([])
  }

  const closePopup = () => {
    setSelectedPersil(null)
  }

  return (
    <div className="landwise-map-layout">
      <div className="landwise-map">
        <MapContainer
          center={[-7.614701, 110.197831]}
          zoom={13}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer
              checked
              name="Satellite Imagery (Esri)"
            >
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="OpenStreetMap">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay
              checked
              name="Bidang Tanah LANDWISE"
            >
              <WMSTileLayer
                url={GEOSERVER_WMS}
                layers={WMS_LAYER}
                format="image/png"
                transparent
                version="1.1.1"
                opacity={opacity / 100}
              />
            </LayersControl.Overlay>
          </LayersControl>

          <MapInteraction
            onSelect={setSelectedPersil}
            measureMode={measureMode}
            setMeasurePoints={setMeasurePoints}
          />

          <LocateButton onMessage={setLocationMessage} />

          <SelectedPersilLayer
            persilId={selectedPersil?.persilId}
          />

          {/* POP-UP MENEMPEL PADA LOKASI BIDANG YANG DIKLIK */}
          {selectedPersil?.position && (
            <Popup
              position={selectedPersil.position}
              closeButton={false}
              closeOnClick={false}
              autoPan
              autoPanPadding={[35, 35]}
              maxWidth={340}
              minWidth={280}
              className="landwise-leaflet-popup"
            >
              <PersilInformationPanel
                selectedPersil={selectedPersil}
                onClose={closePopup}
              />
            </Popup>
          )}

          {/* HASIL PENGUKURAN */}
          {measurePoints.length > 0 && (
            <>
              {measureMode === 'distance' && (
                <Polyline
                  positions={measurePoints}
                  pathOptions={{
                    color: '#e28a32',
                    weight: 4,
                    dashArray: '7 6',
                  }}
                />
              )}

              {measureMode === 'area' &&
                measurePoints.length >= 3 && (
                  <Polygon
                    positions={measurePoints}
                    pathOptions={{
                      color: '#e28a32',
                      fillColor: '#f4b65e',
                      fillOpacity: 0.25,
                      weight: 3,
                    }}
                  />
                )}

              {measurePoints.map((point, index) => (
                <CircleMarker
                  key={`${point.lat}-${point.lng}-${index}`}
                  center={point}
                  radius={5}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: '#e28a32',
                    fillOpacity: 1,
                  }}
                />
              ))}
            </>
          )}
        </MapContainer>

        {/* TOOLS PETA */}
        <div className="landwise-map-tools">
          <div className="landwise-tools-title">
            TOOLS PETA
          </div>

          <button
            type="button"
            className={`landwise-tool-button ${
              measureMode === 'distance' ? 'active' : ''
            }`}
            onClick={() => startMeasure('distance')}
          >
            ↔ Ukur Jarak
          </button>

          <button
            type="button"
            className={`landwise-tool-button ${
              measureMode === 'area' ? 'active' : ''
            }`}
            onClick={() => startMeasure('area')}
          >
            ▱ Ukur Luas
          </button>

          {measureMode && (
            <button
              type="button"
              className="landwise-tool-button landwise-tool-finish"
              onClick={stopMeasure}
            >
              Selesai / Hapus
            </button>
          )}

          <div className="landwise-opacity-control">
            <label htmlFor="persil-opacity">
              Transparansi Persil <strong>{opacity}%</strong>
            </label>

            <input
              id="persil-opacity"
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(event) =>
                setOpacity(Number(event.target.value))
              }
            />
          </div>

          <div className="landwise-crs-info">
            <strong>Sistem Koordinat Peta</strong>
            <span>EPSG:3857 — WGS 84 / Web Mercator</span>
            <small>
              Koordinat geografis lokasi menggunakan WGS 84 (EPSG:4326).
            </small>
          </div>
        </div>

        {measureMode && (
          <div className="landwise-measure-result">
            <strong>
              {measureMode === 'distance'
                ? 'Pengukuran Jarak'
                : 'Pengukuran Luas'}
            </strong>

            <span>
              {measureMode === 'distance'
                ? formatDistance(distance)
                : measurePoints.length < 3
                  ? 'Tambahkan minimal 3 titik'
                  : formatArea(area)}
            </span>

            <small>
              Klik peta untuk menambahkan titik pengukuran.
            </small>
          </div>
        )}

        {locationMessage && (
          <div className="landwise-location-message">
            {locationMessage}

            <button
              type="button"
              onClick={() => setLocationMessage('')}
              aria-label="Tutup pesan lokasi"
            >
              ×
            </button>
          </div>
        )}

        {/* LEGENDA */}
        <div className="landwise-map-legend">
          <h4>Legenda Penggunaan Tanah</h4>

          {LEGEND_ITEMS.map((item) => (
            <div
              className="landwise-legend-item"
              key={item.label}
            >
              <span
                className="landwise-legend-color"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PetaMap
