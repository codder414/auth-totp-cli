import {generateTotp} from './generate-totp'

export function validateKey(key: string): void {
  generateTotp(key)
}
