
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://attribute-issued-salvador-pmc.trycloudflare.com'
).replace(/\/$/, '')

// Membaca respons API dengan penanganan error
async function handleResponse(response, fallbackMessage) {
  let result

  try {
    result = await response.json()
  } catch {
    throw new Error(fallbackMessage)
  }

  if (!response.ok) {
    throw new Error(
      typeof result.detail === 'string'
        ? result.detail
        : fallbackMessage
    )
  }

  return result
}

// Membuat request API
async function apiRequest(endpoint, options = {}, fallbackMessage = 'Terjadi kesalahan pada server.') {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  })

  return handleResponse(response, fallbackMessage)
}

// Login pengguna (endpoint lama)
export async function loginUser(username, password) {
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  return apiRequest(
    '/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    },
    'Login gagal. Periksa koneksi, username, dan kata sandi.'
  )
}

// Mengambil profil pengguna
export async function getCurrentUser(token) {
  return apiRequest(
    '/auth/me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    'Gagal mengambil data pengguna.'
  )
}

// Mengambil statistik dashboard
export async function getDashboardStatistics(token) {
  return apiRequest(
    '/dashboard/statistics',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    'Gagal mengambil statistik dashboard.'
  )
}

// Mengambil informasi persil dari GeoServer melalui backend
export async function getMapFeatureInfo({ bbox, width, height, x, y }, token = '') {
  const params = new URLSearchParams({
    bbox,
    width: String(width),
    height: String(height),
    x: String(x),
    y: String(y),
  })

  return apiRequest(
    `/map/feature-info?${params.toString()}`,
    {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    },
    'Gagal mengambil informasi bidang tanah.'
  )
}

// Mengambil detail persil publik
export async function getPublicPersilDetail(persilId) {
  return apiRequest(
    `/persil/${persilId}`,
    {},
    'Gagal mengambil detail persil publik.'
  )
}

// Mengambil detail persil pemerintah
export async function getGovernmentPersilDetail(persilId, token) {
  return apiRequest(
    `/government/persil/${persilId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    'Gagal mengambil detail persil pemerintah.'
  )
}

// Mengambil data PBB pengguna yang sudah login
export async function getRegisteredPBB(
  token,
  page = 1,
  perPage = 10,
  keyword = ''
) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    keyword,
  })

  return apiRequest(
    `/pbb?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    'Gagal mengambil data PBB.'
  )
}
