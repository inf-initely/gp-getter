import { downloadTask } from './src/core.ts'
import { extractArgs } from './src/helper.ts'

import { exists } from 'https://deno.land/std@0.105.0/fs/mod.ts'
import { join } from 'https://deno.land/std@0.105.0/path/mod.ts'

const { args, switches } = extractArgs(Deno.args)
const _switches: Partial<{
  outputFolder: string
  noParallel: boolean
  failedLocation: string
  concurrency: number
  skipExisting: boolean
}> = {}

for(const sw of switches) {
  const [command, value] = sw.split(' ')
  switch(command) {
    case '-O':
    case '--output':
      _switches.outputFolder = value
      break

    case '-N':
    case '--no-parallel':
      _switches.noParallel = true
      break

    case '-F':
    case '--failed-output':
      _switches.failedLocation = value
      break

    case '-C':
    case '--concurrency-limit':
      _switches.concurrency = Number.parseInt(value)

    case '-S':
    case '--skip-existing':
      _switches.skipExisting = true
      break
  }
}

if(args.length < 2)
  throw new Error('Lacking arguments! Should provide input file and url format!')

const fileLocation = args[0]
const urlInject = args[1]

let inputs: string
try {
  inputs = Deno.readTextFileSync(fileLocation)
} catch(e) {
  throw e
}

if(urlInject.indexOf('[INJECT]') === -1)
  throw new Error('URL injection should include placeholder `[INJECT]` as injection point for the input!')

if(_switches.outputFolder)
  if(await exists(_switches.outputFolder) === false)
    throw new Error(`Output folder doesn't exist!`)

console.log('Download task starting...')
const _failed: string[] = []
await downloadTask(inputs.split('\n'), {
  onGetURL: (i) => urlInject.replace('[INJECT]', i),
  onSave: async (i, res) => {
    console.log(`[${i}]`, 'Saving result')
    try {
      _switches.outputFolder ?
        await Deno.writeTextFile(join(_switches.outputFolder, i), JSON.stringify(res)) :
        await Deno.writeTextFile(join('result', i), JSON.stringify(res))
    } catch(e) {
      console.log('Error saving file!')
      _failed.push(i)
    }
  },
  onFailed: (i) => {
    console.log('Failed to download')
    _failed.push(i)
  },
  onLogPrefix: (i) => `[${i}]`,
  concurrencyLimit: _switches.concurrency ?? 10
})
console.log('Emitting failed task...')
Deno.writeTextFileSync(_switches.failedLocation ?? 'failed.txt', _failed.join('\n'))
console.log('Download task complete.')
