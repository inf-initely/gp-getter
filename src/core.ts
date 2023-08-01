import { pLimit } from "https://deno.land/x/p_limit@v1.0.0/mod.ts";
import { exec, OutputMode } from "./runExec.ts";

/**
 * Fetching Interface
 * ---
 * Interface for fetching. Implemented 3 method of fetching:
 * - `mock` for testing functionality
 * - `curl` using external curl
 * - `fetch` using fetch method
 */
function fetchInterface(handler: 'mock' | 'curl' | 'fetch' | (string & {}), url: string): Promise<any> {
  switch(handler) {
    case 'mock':
      return new Promise((res, rej) => {
        setTimeout(() => res(null), 2000)
      })
    case 'curl':
      return new Promise((res, rej) => {
        // exec(`./curl/curl.exe "${url}"`, { output: OutputMode.Capture })
        //   .then(curlRes => {
        //     if(curlRes.status.success)
        //       res(JSON.parse(curlRes.output))
        //     else {
        //       console.log(curlRes)
        //       throw 'Download failed'
        //     }
        //   })
        //   .catch(e => {
        //     console.log(e)
        //     throw e
        //   })
        res(null)
      })
    case 'fetch':
    default:
      return fetch(url).then(res => res.json())
  }
}

interface DownloadOptions<T> {
  /** Number of attempt before giving up. Default: `3` */
  retryAttempt?: number
  /** Method used to fetch data. Default: `fetch` */
  method?: 'curl' | 'fetch' | 'mock' | (string & {}),
  /** Should do logging? Default: `true` */
  log?: boolean,
  /** Log prefix. Default: `[empty string]` */
  logPrefix?: string
  /** Should skip if file already exist? */
  skipExisting?: boolean
  /** Function to call on any failures. */
  onFailed: () => void
  /** Function to call on file saving. */
  onSave: (JSONResult: any) => Promise<void>,
}

/**
 * Download Function
 * ---
 * Main function to run a download task. Input here is `any`.
 * This function depends on `onFailed` and `onSave` options
 * which will be called with parameters `input: T`:
 * - `onFailed` is used to handle failure=
 * - `onSave` is used to handle output saving (post-download)
 *
 * Example:
 * ```
 * await download('http://localhost/api', {
 *   retryAttempt: 10,
 *   onFailed: () => {},
 *   onSave: (res: any) => {
 *     if(res.success == false || res.type !== 'FeatureCollection')
 *       return
 *
 *     Deno.writeTextFileSync(`./output.txt`, JSON.stringify())
 *   }
 * })
 * ```
 */
async function download<T>(url: string, options: DownloadOptions<T>) {
  const { log, logPrefix, retryAttempt, method } = Object.assign({
    log: true,
    logPrefix: '',
    retryAttempt: 3,
    method: 'fetch'
  }, options)

  const { onFailed, onSave } = options

  const logger = (...args: any[]) => log ? console.log(...args) : null

  let incomingData
  let attempt = 0
  while(attempt <= retryAttempt)
    try {
      logger(logPrefix, `Attempt to download`)
      incomingData = await fetchInterface(method, url)
      logger(logPrefix, `Download complete.`)
      break
    } catch(e) {
      attempt++
      if(attempt <= retryAttempt) {
        logger(logPrefix, `Download failed, retry attempt #${attempt}.`)
      }
      else {
        // _failed.push(input)
        onFailed()
        logger(logPrefix, `Download failed, skipping (no more attempt left)!`)
      }
    }

  if(incomingData != null)
    try {
      // Deno.writeTextFileSync(`./result/${input.kode}.json`, JSON.stringify(incomingData))
      await onSave(incomingData)
    }
    catch(e) {
      logger(logPrefix, `Failed to save file!`, e)
    }
}

interface DownloadTaskOptions<T>
extends Omit<DownloadOptions<T>, 'logPrefix' | 'onFailed' | 'onSave'> {
  /** Number of task running in parallel */
  concurrencyLimit?: number
  /**
   * Should use parallel limiter (equivalent of parallel-immediate in curl)?
   * Where `limiter: false` is equivalent to `--parallel-immediate` in curl.
   * Default: `true`
  */
  limiter?: boolean,
  /** Function to call on prefixing log. Default: `(in: T) => [empty string]` */
  onLogPrefix?: (input: T) => string,
  /** Function to call on defining URL for each download. */
  onGetURL: (input: T) => string,
  /** Function to call on any failures. */
  onFailed: (input: T, url: string) => void,
  /** Function to call on file saving. */
  onSave: (input: T, JSONResult: any) => Promise<void>,
}

/**
 * Download Task Function
 * ---
 * Helper function to run batch download task. Input here is `any[]`.
 * This function depends on `onFailed`, `onGetURL`, and `onSave` options
 * which will be called with parameters `input: T`:
 * - `onFailed` is used to handle failure
 * - `onGetURL` is used to handle fetching URL definition
 * - `onSave` is used to handle output saving (post-download)
 *
 * Example:
 * ```
 * await downloadTask(inputs, {
 *   retryAttempt: 10,
 *   onFailed: (input: T, url: string) => failed.push(input),
 *   onGetURL: (input: T) => input.uuid,
 *   onSave: (res: any) => {
 *     if(res.success == false || res.type !== 'FeatureCollection')
 *       return
 *
 *     Deno.writeTextFileSync(`./output.txt`, JSON.stringify())
 *   }
 * })
 * ```
 * @param inputs Array of data as input.
 * @param options Download task options.
 */
async function downloadTask<T>(inputs: T[], options: DownloadTaskOptions<T>) {
  const { concurrencyLimit, limiter, onGetURL, onFailed, onSave, onLogPrefix, ...temp } = Object.assign({
    concurrencyLimit: 10,
    limiter: true,
    onLogPrefix: () => ''
  }, options)

  if(limiter) {
    const limit = pLimit(concurrencyLimit)
    await Promise.all(inputs.map((input, index) => limit(() =>
      download(onGetURL(input), {
        onFailed: () => onFailed(input, onGetURL(input)),
        onSave: async (res: any) => await onSave(input, res),
        logPrefix: onLogPrefix(input)
      })
    )))
  }

  else {
    await Promise.all(inputs.map((input, index) => download(onGetURL(input), {
      onFailed: () => onFailed(input, onGetURL(input)),
      onSave: async (res: any) => await onSave(input, res),
      logPrefix: onLogPrefix(input)
    })))
  }
}

export { download, downloadTask }
