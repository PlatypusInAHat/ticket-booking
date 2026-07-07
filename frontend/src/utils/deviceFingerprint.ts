const STORAGE_KEY = "ticketstage_device_id"

const randomId = () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const getStableDeviceId = () => {
  const existing = window.localStorage.getItem(STORAGE_KEY)
  if (existing) {
    return existing
  }

  const nextId = randomId()
  window.localStorage.setItem(STORAGE_KEY, nextId)
  return nextId
}

const toHex = (buffer: ArrayBuffer) => (
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
)

const fallbackHash = (value: string) => btoa(unescape(encodeURIComponent(value)))
  .replace(/[^a-zA-Z0-9]/g, "")
  .slice(0, 128)

export const getDeviceFingerprint = async () => {
  const payload = [
    getStableDeviceId(),
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(navigator.hardwareConcurrency || ""),
  ].join("|")

  if (!crypto?.subtle) {
    return fallbackHash(payload)
  }

  const data = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return toHex(digest)
}
