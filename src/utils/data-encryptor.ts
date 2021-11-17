import * as crypto from 'crypto'

export type EncryptedData = {
  iv: string;
  payload: string;
  key?: string;
}

interface CipherInt {
  readonly algorithm: string;
  encrypt(payload: string, ...other: any[]): EncryptedData;
  decrypt(encryptedData: EncryptedData, ...other: any[]): string;
}

export class KeyCipher implements CipherInt {
  algorithm = 'aes-256-cbc';

  private key = crypto.randomBytes(32);

  private iv = crypto.randomBytes(16);

  encrypt(payload: string): EncryptedData {
    const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv)
    return {
      iv: this.iv.toString('hex'),
      payload: cipher.update(payload, 'utf8', 'hex') + cipher.final('hex'),
      key: this.key.toString('hex'),
    }
  }

  decrypt(encryptedData: EncryptedData): string {
    const iv = Buffer.from(encryptedData.iv, 'hex')
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(encryptedData.key as string, 'hex'), iv)
    return decipher.update(encryptedData.payload, 'hex', 'utf8') + decipher.final('utf8')
  }
}

export class PasswordCipher implements CipherInt {
  algorithm = 'aes-192-cbc'

  private iv: Buffer;

  constructor() {
    this.iv = crypto.randomBytes(16)
  }

  encrypt(payload: string, password: string): EncryptedData {
    const key = crypto.scryptSync(password, 'salt', 24)
    const cipher = crypto.createCipheriv(this.algorithm, key, this.iv)
    return {
      iv: this.iv.toString('hex'),
      payload: cipher.update(payload, 'utf8', 'hex') + cipher.final('hex'),
    }
  }

  decrypt(encryptedData: EncryptedData, password: string): string {
    const key = crypto.scryptSync(password, 'salt', 24)
    const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(encryptedData.iv, 'hex'))
    return decipher.update(encryptedData.payload, 'hex', 'utf8') + decipher.final('utf8')
  }
}
