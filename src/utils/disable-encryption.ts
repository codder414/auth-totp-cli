import {Config} from './config'
import {EncryptedData, KeyCipher, PasswordCipher} from './data-encryptor'
import {askPassword} from './ask-password'

export async function disableEncryption(config: Config, passwordCypher: PasswordCipher, keyCypher: KeyCipher): Promise<boolean> {
  const loadedKey = config.get('key') as EncryptedData
  if (!loadedKey.key && config.get('encrypted')) {
    const password = await askPassword('Password')
    const decryptedKey = passwordCypher.decrypt(loadedKey, password)
    config.set('key', decryptedKey)
    config.set('encrypted', false)
    config.set('type', undefined)
    config.save()
    return true
  }
  if (loadedKey.key && config.get('encrypted')) {
    const decryptedKey = keyCypher.decrypt(loadedKey)
    config.set('key', decryptedKey)
    config.set('encrypted', false)
    config.set('type', undefined)
    config.save()
    return true
  }
  return false
}
