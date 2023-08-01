function extractArgs(args: string[]) {
  const Args = Array.from(args)

  const _switches: string[] = []
  const _args: string[] = []
  
  function handleArg() {
    const cursor = Args.shift()!
    if(cursor.startsWith('--') || cursor.startsWith('-')) {
      const nextArg = Args[0]
      if(nextArg == null || nextArg.startsWith('--') || nextArg.startsWith('-')) _switches.push(cursor)
      else _switches.push(cursor + ' ' + Args.shift())
    }
  
    else _args.push(cursor)
  }
  
  while(Args.length > 0) handleArg()
  return { 
    args: Array.from(new Set(_args)), 
    switches: Array.from(new Set(_switches)) 
  }
}

export { extractArgs }