/* eslint max-classes-per-file: ["error", 2] */

import { test } from 'tap'
import { EventEmitter } from 'events'
import { Level } from '../src/index'

class MockLogger {
  level: any
  context: Record<string, any>
  contexts: Record<string, any>[]

  constructor () {
    this.level = (Level as any).TRACE
    this.context = {}
    this.contexts = []
  }

  log (level?: any, message?: any) {
    this.contexts.push(Object.assign({}, this.context, { level, message }))
  }

  isLevelEnabled (level: any) {
    return level.isGreaterThanOrEqualTo(this.level)
  }

  addContext (key: string, value: any) {
    this.context[key] = value
  }

  removeContext (key: string) {
    delete this.context[key]
  }
}

function MockRequest (remoteAddr: string, method: string, originalUrl: string) {
  // @ts-ignore
  this.socket = { remoteAddress: remoteAddr }
  // @ts-ignore
  this.originalUrl = originalUrl
  // @ts-ignore
  this.method = method
  // @ts-ignore
  this.httpVersionMajor = '5'
  // @ts-ignore
  this.httpVersionMinor = '0'
  // @ts-ignore
  this.headers = {}
}

class MockResponse extends EventEmitter {
  statusCode: number
  cachedHeaders: Record<string, any>

  constructor (code: number) {
    super()
    this.statusCode = code
    this.cachedHeaders = {}
  }

  end (...args: any[]) {
    this.emit('finish')
  }

  setHeader (key: string, value: any) {
    this.cachedHeaders[key.toLowerCase()] = value
  }

  getHeader (key: string) {
    return this.cachedHeaders[key.toLowerCase()]
  }

  writeHead (code: number /* , headers */) {
    this.statusCode = code
    return this
  }
}

test('log4js connect logger', async (batch) => {
  const { connect: clm } = await import('../src/index')

  batch.test('with context config', (t) => {
    const ml = new MockLogger()
    const cl = clm(ml, { context: true })

    t.beforeEach((done) => {
      ml.contexts = []
      if (typeof done === 'function') {
        done()
      }
    })

    t.test('response should be included in context', (assert) => {
      const { contexts } = ml
      const req = new MockRequest(
        'my.remote.addr',
        'GET',
        'http://url/hoge.png'
      ) // not gif
      const res = new MockResponse(200)
      cl(req, res, () => { })
      res.end('chunk', 'encoding')

      assert.type(contexts, 'Array')
      assert.equal(contexts.length, 1)
      assert.type(contexts[0].res, MockResponse)
      assert.end()
    })

    t.end()
  })

  batch.test('without context config', (t) => {
    const ml = new MockLogger()
    const cl = clm(ml, {})

    t.beforeEach((done) => {
      ml.contexts = []
      if (typeof done === 'function') {
        done()
      }
    })

    t.test('response should not be included in context', (assert) => {
      const { contexts } = ml
      const req = new MockRequest(
        'my.remote.addr',
        'GET',
        'http://url/hoge.png'
      ) // not gif
      const res = new MockResponse(200)
      cl(req, res, () => { })
      res.end('chunk', 'encoding')

      assert.type(contexts, 'Array')
      assert.equal(contexts.length, 1)
      assert.type(contexts[0].res, undefined)
      assert.end()
    })

    t.end()
  })

  batch.end()
})
