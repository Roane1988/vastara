let regenciesPromise = null
let districtsPromise = null

export function loadRegencies() {
  if (!regenciesPromise) regenciesPromise = import('../data/wilayah/regencies.json').then((m) => m.default || m)
  return regenciesPromise
}

export function loadDistricts() {
  if (!districtsPromise) districtsPromise = import('../data/wilayah/districts.json').then((m) => m.default || m)
  return districtsPromise
}

export function cleanCityName(name) {
  return String(name || '').replace(/^(Kabupaten|Kota)\s+/i, '').trim()
}
