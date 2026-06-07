export function cascadingDiscount(base: number, steps: number[]): number {
  return steps.reduce((price, step) => price * (1 - step / 100), base)
}

export function lineOmzet(discountedPrice: number, qty: number): number {
  return discountedPrice * qty
}

export function lineLaba(
  discountedPrice: number,
  modal: number,
  qty: number
): number {
  return (discountedPrice - modal) * qty
}

export function totalPiutang(omzet: number, ongkir: number): number {
  return omzet + ongkir
}

export function bonusAvailable(
  paidOmzet: number,
  threshold: number,
  alreadyGranted: number
): number {
  return Math.floor(paidOmzet / threshold) - alreadyGranted
}
