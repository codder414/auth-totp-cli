import * as path from 'path'

export function getHomeDir(): string {
  let targetPath: string | null = null
  switch (process.platform) {
  case 'darwin': targetPath = path.join(`${process.env.HOME}`, '/Library/Preferences')
    break
  case 'cygwin':
  case 'win32': targetPath = `${process.env.APPDATA}`
    break
  case 'linux':
  case 'freebsd': targetPath = path.join(`${process.env.HOME}`, '.local/share')
  }
  if (!targetPath) {
    throw new Error(`Cannot get default key path for platform '${process.platform}'`)
  }
  return targetPath
}
