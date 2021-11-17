import totpGenerator from 'totp-generator'

export function generateTotp(key: string | undefined): number {
  if (!key) {
    throw new Error('Please set key!')
  }
  return totpGenerator(key, {period: 30})
}
