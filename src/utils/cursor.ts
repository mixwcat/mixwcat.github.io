const cursorSizeKey = 'gyoza-cursor-size'

const SIZES = [32, 40, 48]

export function getLocalCursorSize(): number {
  const local = localStorage.getItem(cursorSizeKey)
  const n = Number(local)
  if (SIZES.includes(n)) return n
  setLocalCursorSize(32)
  return 32
}

export function setLocalCursorSize(size: number) {
  localStorage.setItem(cursorSizeKey, String(size))
}

export function getNextCursorSize(size: number): number {
  const idx = SIZES.indexOf(size)
  return SIZES[(idx + 1) % SIZES.length]
}
