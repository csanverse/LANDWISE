
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
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

// Login pengguna
export async function loginUser(username, password) {
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })

  return handleResponse(
    response,
    'Login gagal. Periksa koneksi, username, dan kata sandi.'
  )
}

// Mengambil profil pengguna
export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return handleResponse(response, 'Gagal mengambil data pengguna.')
}

// Mengambil statistik dashboard
export async function getDashboardStatistics(token) {
  const response = await fetch(`${API_BASE_URL}/dashboard/statistics`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return handleResponse(response, 'Gagal mengambil statistik dashboard.')
}

// Mengambil informasi persil dari GeoServer melalui backend
export async function getMapFeatureInfo({ bbox, width, height, x, y }) {
  const params = new URLSearchParams({
    bbox,
    width: String(width),
    height: String(height),
    x: String(x),
    y: String(y),
  })

  const response = await fetch(
    `${API_BASE_URL}/map/feature-info?${params.toString()}`
  )

  return handleResponse(
    response,
    'Gagal mengambil informasi bidang tanah.'
  )
}

// Mengambil detail persil publik
export async function getPublicPersilDetail(persilId) {
  const response = await fetch(`${API_BASE_URL}/persil/${persilId}`)

  return handleResponse(
    response,
    'Gagal mengambil detail persil publik.'
  )
}

// Mengambil detail persil pemerintah
export async function getGovernmentPersilDetail(persilId, token) {
  const response = await fetch(
    `${API_BASE_URL}/government/persil/${persilId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return handleResponse(
    response,
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

  const response = await fetch(
    `${API_BASE_URL}/pbb?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return handleResponse(response, 'Gagal mengambil data PBB.')
}
