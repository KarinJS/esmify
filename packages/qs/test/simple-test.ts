import test from 'tape'
import * as utils from '../src/utils.js'

console.log('Starting tests...')

test('merge()', function (t) {
  console.log('Running merge test')
  t.deepEqual(utils.merge(null, true), [null, true], 'merges true into null')
  t.end()
})

console.log('Tests defined')
