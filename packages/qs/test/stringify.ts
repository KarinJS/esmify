import test from 'tape'
import * as qs from '../src/index.js'

test('stringify() basic tests', function (t) {
  t.equal(qs.stringify({ foo: 'bar' }), 'foo=bar')
  t.equal(qs.stringify({ foo: 'bar', baz: 'qux' }), 'foo=bar&baz=qux')
  t.equal(qs.stringify({ foo: '' }), 'foo=')
  t.equal(qs.stringify({ foo: null }), 'foo=')
  t.equal(qs.stringify({ foo: null }, { strictNullHandling: true }), 'foo')
  t.equal(qs.stringify({ foo: undefined }), '')
  t.equal(qs.stringify({ foo: ['bar', 'baz'] }), 'foo%5B0%5D=bar&foo%5B1%5D=baz')
  t.equal(qs.stringify({ foo: ['bar', 'baz'] }, { arrayFormat: 'indices' }), 'foo%5B0%5D=bar&foo%5B1%5D=baz')
  t.equal(qs.stringify({ foo: ['bar', 'baz'] }, { arrayFormat: 'brackets' }), 'foo%5B%5D=bar&foo%5B%5D=baz')
  t.equal(qs.stringify({ foo: ['bar', 'baz'] }, { arrayFormat: 'repeat' }), 'foo=bar&foo=baz')
  t.equal(qs.stringify({ foo: ['bar', 'baz'] }, { arrayFormat: 'comma' }), 'foo=bar%2Cbaz')
  t.end()
})

test('stringify() encoding', function (t) {
  t.equal(qs.stringify({ a: 'b c' }), 'a=b%20c')
  t.equal(qs.stringify({ 'a b': 'c d' }), 'a%20b=c%20d')
  t.equal(qs.stringify({ 'foo[bar]': 'baz' }), 'foo%5Bbar%5D=baz')
  t.equal(qs.stringify({ foo: 'bar', baz: 'qux' }, { encode: false }), 'foo=bar&baz=qux')
  t.equal(qs.stringify({ 'a b': 'c d' }, { encode: false }), 'a b=c d')
  t.end()
})

test('stringify() date serialization', function (t) {
  const date = new Date('2016-01-01T00:00:00.000Z')
  t.equal(qs.stringify({ foo: date }), 'foo=2016-01-01T00%3A00%3A00.000Z')
  t.equal(qs.stringify({ foo: date }, { serializeDate: (d) => d.getTime().toString() }), 'foo=1451606400000')
  t.end()
})

test('stringify() nested objects', function (t) {
  t.equal(qs.stringify({ foo: { bar: 'baz' } }), 'foo%5Bbar%5D=baz')
  t.equal(qs.stringify({ foo: { bar: { baz: 'qux' } } }), 'foo%5Bbar%5D%5Bbaz%5D=qux')
  t.equal(qs.stringify({ foo: { bar: 'baz' } }, { encode: false }), 'foo[bar]=baz')
  t.end()
})
