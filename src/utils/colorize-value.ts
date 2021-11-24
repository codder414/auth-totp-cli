import chalk from 'chalk'

export function colorizeValue(value: number, templateStr: string): string {
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
