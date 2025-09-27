import { inspect } from 'node:util'
import debugFactory from 'debug'
import type { Configuration } from './types/core'

const debug = debugFactory('log4js:configuration')

const preProcessingListeners: Array<(config: Configuration) => void> = []
const listeners: Array<(config: Configuration) => void> = []

const not = (thing: unknown): boolean => !thing

const anObject = (thing: unknown): boolean =>
  Boolean(thing && typeof thing === 'object' && !Array.isArray(thing))

const validIdentifier = (thing: unknown): boolean =>
  typeof thing === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/g.test(thing)

const anInteger = (thing: unknown): boolean =>
  Boolean(thing && typeof thing === 'number' && Number.isInteger(thing))

const addListener = (fn: (config: Configuration) => void): void => {
  listeners.push(fn)
  debug(`Added listener, now ${listeners.length} listeners`)
}

const addPreProcessingListener = (fn: (config: Configuration) => void): void => {
  preProcessingListeners.push(fn)
  debug(
    `Added pre-processing listener, now ${preProcessingListeners.length} listeners`
  )
}

const throwExceptionIf = (config: Configuration, checks: boolean | boolean[], message: string): void => {
  const tests = Array.isArray(checks) ? checks : [checks]
  tests.forEach((test) => {
    if (test) {
      throw new Error(
        `Problem with log4js configuration: (${inspect(config, {
          depth: 5,
        })}) - ${message}`
      )
    }
  })
}

const configure = (candidate: Configuration): void => {
  debug('New configuration to be validated: ', candidate)
  throwExceptionIf(candidate, not(anObject(candidate)), 'must be an object.')

  debug(`Calling pre-processing listeners (${preProcessingListeners.length})`)
  preProcessingListeners.forEach((listener) => listener(candidate))
  debug('Configuration pre-processing finished.')

  debug(`Calling configuration listeners (${listeners.length})`)
  listeners.forEach((listener) => listener(candidate))
  debug('Configuration finished.')
}

export {
  configure,
  addListener,
  addPreProcessingListener,
  throwExceptionIf,
  anObject,
  anInteger,
  validIdentifier,
  not,
}
