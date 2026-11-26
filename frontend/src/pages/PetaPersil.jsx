
import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import PetaMap from './PetaMap'
import './PetaPersil.css'

function PetaPersil() {
  const [selectedLayer, setSelectedLayer] = useState('penggunaan')

  return (
    <DashboardLayout
      title="Peta Persil"
      description="Visualisasi informasi bidang tanah dalam wilayah kajian."
    >
      <div className="peta-page">
        <section className="peta-toolbar">
          <div>
            <label htmlFor="layer-select">Klasifikasi Peta</label>
            <select
              id="layer-select"
              value={selectedLayer}
              onChange={(event) => setSelectedLayer(event.target.value)}
            >
              <option value="penggunaan">Penggunaan Tanah</option>
            </select>
          </div>

          <span className="peta-status">
            Terhubung dengan GeoServer
          </span>
        </section>

        <section className="peta-map-container">
          <PetaMap />
        </section>

        <section className="peta-information">
          <h3>Informasi Peta</h3>
          <p>
            Peta menampilkan sebaran bidang tanah berdasarkan
            klasifikasi penggunaan tanah. Gunakan kontrol layer
            untuk mengatur tampilan peta.
          </p>
        </section>
      </div>
    </DashboardLayout>
  )
}

export default PetaPersil
