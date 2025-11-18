/* eslint-disable no-lone-blocks */
import debug from 'debug'
import fs from 'fs'
import fsp from 'fs/promises'
import zlib from 'zlib'

const debugLog = debug('streamroller:moveAndMaybeCompressFile')

export interface MoveAndCompressOptions {
  mode?: number
  compress?: boolean
}

const _parseOption = (rawOptions?: MoveAndCompressOptions): Required<MoveAndCompressOptions> => {
  const defaultOptions: Required<MoveAndCompressOptions> = {
    mode: parseInt('0600', 8),
    compress: false,
  }
  const options = Object.assign({}, defaultOptions, rawOptions)
  debugLog(`_parseOption: moveAndMaybeCompressFile called with option=${JSON.stringify(options)}`)
  return options
}

const moveAndMaybeCompressFile = async (
  sourceFilePath: string,
  targetFilePath: string,
  options?: MoveAndCompressOptions
): Promise<void> => {
  const parsedOptions = _parseOption(options)

  if (sourceFilePath === targetFilePath) {
    debugLog('moveAndMaybeCompressFile: source and target are the same, not doing anything')
    return
  }

  try {
    await fsp.access(sourceFilePath)
  } catch {
    return
  }
  {
    debugLog(
      `moveAndMaybeCompressFile: moving file from ${sourceFilePath} to ${targetFilePath} ${parsedOptions.compress ? 'with' : 'without'
      } compress`
    )
    if (parsedOptions.compress) {
      await new Promise<void>((resolve, reject) => {
        let isCreated = false
        // to avoid concurrency, the forked process which can create the file will proceed (using flags wx)
        const writeStream = fs.createWriteStream(targetFilePath, { mode: parsedOptions.mode, flags: 'wx' })
          // wait until writable stream is valid before proceeding to read
          .on('open', () => {
            isCreated = true
            const readStream = fs.createReadStream(sourceFilePath)
              // wait until readable stream is valid before piping
              .on('open', () => {
                readStream.pipe(zlib.createGzip()).pipe(writeStream)
              })
              .on('error', (e) => {
                debugLog(`moveAndMaybeCompressFile: error reading ${sourceFilePath}`, e)
                // manually close writable: https://nodejs.org/api/stream.html#readablepipedestination-options
                writeStream.destroy(e)
              })
          })
          .on('finish', () => {
            debugLog(`moveAndMaybeCompressFile: finished compressing ${targetFilePath}, deleting ${sourceFilePath}`)
            // delete sourceFilePath
            fsp.unlink(sourceFilePath)
              .then(resolve)
              .catch((e) => {
                debugLog(`moveAndMaybeCompressFile: error deleting ${sourceFilePath}, truncating instead`, e)
                // fallback to truncate
                fsp.truncate(sourceFilePath)
                  .then(resolve)
                  .catch((e) => {
                    debugLog(`moveAndMaybeCompressFile: error truncating ${sourceFilePath}`, e)
                    reject(e)
                  })
              })
          })
          .on('error', (e) => {
            if (!isCreated) {
              debugLog(`moveAndMaybeCompressFile: error creating ${targetFilePath}`, e)
              // do not do anything if handled by another forked process
              reject(e)
            } else {
              debugLog(`moveAndMaybeCompressFile: error writing ${targetFilePath}, deleting`, e)
              // delete targetFilePath (taking as nothing happened)
              fsp.unlink(targetFilePath)
                .then(() => { reject(e) })
                .catch((e) => {
                  debugLog(`moveAndMaybeCompressFile: error deleting ${targetFilePath}`, e)
                  reject(e)
                })
            }
          })
      }).catch(() => { })
    } else {
      debugLog(`moveAndMaybeCompressFile: renaming ${sourceFilePath} to ${targetFilePath}`)
      try {
        await fsp.rename(sourceFilePath, targetFilePath)
      } catch (e: any) {
        debugLog(`moveAndMaybeCompressFile: error renaming ${sourceFilePath} to ${targetFilePath}`, e)
        /* istanbul ignore else: no need to do anything if file does not exist */
        if (e.code !== 'ENOENT') {
          debugLog('moveAndMaybeCompressFile: trying copy+truncate instead')
          try {
            await fsp.copyFile(sourceFilePath, targetFilePath)
            await fsp.truncate(sourceFilePath)
          } catch (e) {
            debugLog('moveAndMaybeCompressFile: error copy+truncate', e)
          }
        }
      }
    }
  }
}

export default moveAndMaybeCompressFile
