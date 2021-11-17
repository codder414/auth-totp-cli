export function getTimeToExpire(): number {
  return 30 - (Math.round(Date.now() / 1000) % 30)
}
