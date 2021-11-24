import cli from 'cli-ux'

export async function askPassword(title: string): Promise<string> {
  return (await cli.prompt(title, {type: 'hide', required: true}))?.trim()
}
