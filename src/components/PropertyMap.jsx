import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { getImageSrc } from '../utils/images'
import { formatPrice } from '../utils/format'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const BSD_CENTER = [-6.3006, 106.6527]
const KM_PER_DEG_LAT = 111
const KM_PER_DEG_LNG = 111 * Math.cos((BSD_CENTER[0] * Math.PI) / 180)
const RADIUS_KM = 5
const LAT_OFFSET = RADIUS_KM / KM_PER_DEG_LAT
const LNG_OFFSET = RADIUS_KM / KM_PER_DEG_LNG

function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

function assignCoords(properties) {
  return properties.map((p) => {
    if (p._lat && p._lng) return p
    if (p.latitude != null && p.longitude != null) {
      return { ...p, _lat: p.latitude, _lng: p.longitude }
    }
    return {
      ...p,
      _lat: randomInRange(BSD_CENTER[0] - LAT_OFFSET, BSD_CENTER[0] + LAT_OFFSET),
      _lng: randomInRange(BSD_CENTER[1] - LNG_OFFSET, BSD_CENTER[1] + LNG_OFFSET),
    }
  })
}

export default function PropertyMap({ properties }) {
  const navigate = useNavigate()

  const markers = useMemo(() => assignCoords(properties), [properties])

  return (
    <MapContainer
      center={BSD_CENTER}
      zoom={13}
      className="h-[600px] w-full rounded-xl z-0"
      style={{ height: '600px', width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((p) => (
        <Marker key={p.id} position={[p._lat, p._lng]}>
          <Popup>
            <div className="w-[220px]">
              <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden mb-2">
                <img
                  src={getImageSrc(p.image_url)}
                  alt={p.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
                  }}
                />
              </div>
              <p className="text-sm font-extrabold text-brand-primary">
                {p.priceDisplay || formatPrice(p.price)}
              </p>
              <p className="text-xs font-semibold text-brand-text mt-0.5 line-clamp-2">
                {p.title}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/property/${p.id}`)}
                className="mt-2 w-full text-xs font-bold text-white bg-brand-primary hover:brightness-90 rounded-lg py-2 transition-all"
              >
                Lihat Detail
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
