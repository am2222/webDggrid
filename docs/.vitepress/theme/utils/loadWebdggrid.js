/**
 * Load the Webdggrid class, trying the local build first (available in dev via
 * Vite alias) and falling back to the jsDelivr CDN for production builds.
 */
export async function loadWebdggrid() {
  try {
    const mod = await import('webdggrid')
    if (mod.Webdggrid) return mod.Webdggrid
  } catch { /* local build not available */ }

  // Fallback: CDN (works in production where the Vite alias doesn't exist)
  const mod = await new Function(
    'return import("https://cdn.jsdelivr.net/npm/webdggrid/dist/webdggrid.js")'
  )()
  return mod.Webdggrid
}
