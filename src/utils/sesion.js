export function obtenerClaimsSesion() {
  const token = localStorage.getItem('accessToken')
  if (!token) return {}

  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const claims = JSON.parse(window.atob(padded))
    return claims
  } catch {
    return {}
  }
}

export function obtenerPermisos() {
  const permisos = obtenerClaimsSesion().permisos
  return Array.isArray(permisos) ? permisos : []
}

export function tienePermiso(permiso) {
  return obtenerPermisos().includes(permiso)
}

export function nombreValido(nombre) {
  return /^[\p{L}\p{M} ]+$/u.test(nombre.trim())
}
