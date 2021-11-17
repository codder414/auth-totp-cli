import Command from '@oclif/command'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import {DEFAULT_CONFIG_NAME} from '../common'
import {getHomeDir} from './get-home-dir'

export class Config {
    private content: Record<string, unknown> = {encrypted: false};

    public pathToConfig: string;

    // eslint-disable-next-line no-useless-constructor
    constructor(
        private logger: {error: Command['error']; log: Command['log']; warn: Command['warn']}
    ) {
      this.pathToConfig = path.join(getHomeDir(), DEFAULT_CONFIG_NAME)
    }

    load(): void {
      if (this.isConfigExists()) {
        const contentRawJson = fs.readFileSync(this.pathToConfig, {encoding: 'utf8'})
        this.content = JSON.parse(contentRawJson)
      } else {
        this.save()
        this.logger.log(chalk.gray(`created config in '${this.pathToConfig}'`))
      }
    }

    save(): void {
      fs.writeFileSync(this.pathToConfig, JSON.stringify(this.content, null, 2), {encoding: 'utf8'})
    }

    get(key: string): unknown {
      return this.content[key]
    }

    set<T>(key: string, value: T): void {
      this.content[key] = value
    }

    private isConfigExists(): boolean {
      try {
        fs.statSync(this.pathToConfig)
        return true
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          this.logger.error((error as Error).message)
        }
        return false
      }
    }
}
