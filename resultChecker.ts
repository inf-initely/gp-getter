import { join } from 'https://deno.land/std@0.105.0/path/mod.ts'
import { exists } from 'https://deno.land/std@0.105.0/fs/mod.ts'

const missing = []
const inputs = Deno.readTextFileSync('input.txt').split('\n')

while(inputs.length > 0) {
  const cursor = inputs.shift()!
  if(await exists(join('result', cursor)) === false) {
    console.log(`${cursor} missing`)
    missing.push(cursor)
  }
  // else console.log(`${cursor} found!`)
}

Deno.writeTextFileSync('missing.txt', missing.join('\n'))