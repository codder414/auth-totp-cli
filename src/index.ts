/* eslint-disable complexity */
import {Command, flags} from '@oclif/command'
import {generateTotp} from './utils/generate-totp'
import {validateKey} from './utils/validate-key'
import cli from 'cli-ux'
import chalk from 'chalk'
import {Config} from './utils/config'
import {getTimeToExpire} from './utils/get-time-to-expire'
import cliProgress from 'cli-progress'
import {PasswordCipher, EncryptedData, KeyCipher} from './utils/data-encryptor'

const passwordCypher = new PasswordCipher()
const keyCypher = new KeyCipher()

function colorizeValue(value: number, templateStr: string): string {
  if (value <= 30 && value >= 20) {
    return chalk.green(`${value} ${templateStr}`)
  // eslint-disable-next-line max-statements-per-line
  } if (value < 20 && value >= 10) {
    return chalk.yellow(`${value} ${templateStr}`)
  // eslint-disable-next-line max-statements-per-line
  } if (value < 10 && value > 5) {
    return chalk.keyword('orange')(`${value} ${templateStr}`)
  }
  return chalk.red(`${value} ${templateStr}`)
}

async function askPassword(title: string): Promise<string> {
  return (await cli.prompt(title, {type: 'hide', required: true}))?.trim()
}

async function disableEncryption(config: Config): Promise<boolean> {
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
class AuthTotp extends Command {
  static description = 'Generate TOTP for 2FA auth'

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    key: flags.string({char: 'k', description: 'key to be used and stored for totd generator'}),
    encryptKey: flags.boolean({char: 'e', description: 'encrypts saved key', default: false}),
    withPassword: flags.boolean({description: 'enables password encryption', default: false}),
    decryptKey: flags.boolean({description: 'decryptes key'}),
    verbose: flags.boolean({description: 'shows remain time to be token expired', default: false}),
    interative: flags.boolean({char: 'i', description: 'interactive timer with couldown', default: false}),
    next: flags.boolean({char: 'n', description: 'awaits and takes next totp', default: false}),
  }

  static args = []

  async run() {
    const {flags} = this.parse(AuthTotp)
    const key = flags.key
    const verbose = flags.verbose
    const interactive = flags.interative
    const next = flags.next
    const encryptKey = flags.encryptKey
    const withPassword = flags.withPassword
    const decryptKey = flags.decryptKey

    const config = new Config(this)

    config.load()

    if (key) {
      validateKey(key)
      const loadedKey = config.get('key')
      let shouldOverrwrite = false

      if (loadedKey) {
        shouldOverrwrite = await cli.confirm(chalk.yellow('Are sure you want to overrwrite your current key?[yes/no]'))
        if (!shouldOverrwrite) {
          return
        }
      }
      config.set('key', key)
      config.set('encrypted', false)
      config.save()
      this.log(chalk.green(`${shouldOverrwrite ? 'new' : ''} key successfully has written to: '${config.pathToConfig}'`))
      return
    }

    if (withPassword && encryptKey) {
      this.error('You cannot use both --withPassword and --encryptKey at the same time')
    }

    if ((withPassword || encryptKey) && decryptKey) {
      this.error('You cannot use these flags at the same time')
    }

    if (decryptKey) {
      await disableEncryption(config)
      this.log('key successfully decrypted')
      return
    }

    if (encryptKey) {
      let loadedKey = config.get('key') as EncryptedData | string
      if (!loadedKey) {
        this.error('Please first set key via --key [Base 32 string]')
      }
      if (typeof loadedKey !== 'string' && loadedKey.iv) {
        const shouldRewrite = await cli.confirm('key has already encrypted, do you want to replace it?(yes/no)')
        if (!shouldRewrite) {
          return
        }
        await disableEncryption(config)
      }

      loadedKey = config.get('key') as string
      const encryptedKey = keyCypher.encrypt(loadedKey)
      config.set('key', encryptedKey)
      config.set('encrypted', true)
      config.set('type', 'key')
      config.save()
      this.log(chalk.green('key successfully encrypted'))
    }

    if (withPassword) {
      let loadedKey = config.get('key') as EncryptedData | string
      if (!loadedKey) {
        this.error('Please first set key via --key [Base 32 string]')
      }
      if (typeof loadedKey !== 'string' && loadedKey.iv) {
        const shouldRewrite = await cli.confirm('key has already encrypted, do you want to replace it?(yes/no)')
        if (!shouldRewrite) {
          return
        }
        await disableEncryption(config)
      }
      loadedKey = config.get('key') as string
      let done = false
      let targetPassword: string | null = null
      do {
        // eslint-disable-next-line no-await-in-loop
        const password = await askPassword('Password')
        if (password.length < 8) {
          this.log('Minimum length of password is 8')
          continue
        }
        // eslint-disable-next-line no-await-in-loop
        const passwordRepeat: string = await askPassword('Repeat')
        if (password?.trim() === passwordRepeat?.trim()) {
          targetPassword = password?.trim()
          done = true
        } else {
          this.log('Passwords are not equal!')
          continue
        }
      } while (!done)
      if (!targetPassword) {
        this.error('Password is required!')
      }
      const encryptedKey = passwordCypher.encrypt(loadedKey as string, targetPassword)
      config.set('key', encryptedKey)
      config.set('encrypted', true)
      config.set('type', 'password')
      config.save()
      this.log(chalk.green('key successfully encrypted with password'))
      return
    }

    let loadedKey = config.get('key')

    if (!loadedKey) {
      this.error('Please set key via --key [base 32 string]')
    }
    let generatedTotp = 0
    if (config.get('encrypted') && config.get('type') === 'password') {
      let done = false
      do {
        // eslint-disable-next-line no-await-in-loop
        const password: string = await askPassword('Password')
        let decryptedKey: string
        try {
          decryptedKey = passwordCypher.decrypt(loadedKey as EncryptedData, password)
          loadedKey = decryptedKey
          validateKey(loadedKey as string)
          generatedTotp = generateTotp(decryptedKey)
          done = true
          break
        } catch (error) {
          this.log('Wrong password')
          continue
        }
      } while (!done)
    } else if (config.get('encrypted') && config.get('type') === 'key') {
      const decryptedKey: string = keyCypher.decrypt(loadedKey as EncryptedData)
      loadedKey = decryptedKey
      validateKey(loadedKey as string)
      generatedTotp = generateTotp(decryptedKey)
    } else {
      generatedTotp = generateTotp(loadedKey as string)
    }

    if (next) {
      await cli.wait(getTimeToExpire() * 1000)
      generatedTotp = generateTotp(loadedKey as string)
    }

    if (!interactive) {
      this.log(`${generatedTotp}`)
    }

    if (verbose && !interactive) {
      this.log(`Time left: ${getTimeToExpire()}`)
    }

    if (interactive) {
      const progressBar = new cliProgress.SingleBar({
        stopOnComplete: false,
        clearOnComplete: true,
        format: 'Token: {token} | [{bar}] | {colorizedValue}',
        barsize: 10,
      })
      progressBar.start(30, getTimeToExpire(), {
        token: `${generatedTotp}`,
        colorizedValue: colorizeValue(getTimeToExpire(), 'seconds to expire'),
      })
      setInterval(() => progressBar.update(getTimeToExpire(), {
        token: generateTotp(loadedKey as string),
        colorizedValue: colorizeValue(getTimeToExpire(), 'seconds to expire'),
      }), 1000)
    }
  }
}

export = AuthTotp
