import test from 'tape'
import * as qs from '../src/index.js'

test('parse() basic tests', function (t) {
  t.deepEqual(qs.parse('0=foo'), { 0: 'foo' })
  t.deepEqual(qs.parse('foo=c++'), { foo: 'c  ' })
  t.deepEqual(qs.parse('a[>=]=23'), { a: { '>=': '23' } })
  t.deepEqual(qs.parse('a[<=>]==23'), { a: { '<=>': '=23' } })
  t.deepEqual(qs.parse('a[==]=23'), { a: { '==': '23' } })
  t.deepEqual(qs.parse('foo', { strictNullHandling: true }), { foo: null })
  t.deepEqual(qs.parse('foo'), { foo: '' })
  t.deepEqual(qs.parse('foo='), { foo: '' })
  t.deepEqual(qs.parse('foo=bar'), { foo: 'bar' })
  t.deepEqual(qs.parse(' foo = bar = baz '), { ' foo ': ' bar = baz ' })
  t.deepEqual(qs.parse('foo=bar=baz'), { foo: 'bar=baz' })
  t.deepEqual(qs.parse('foo=bar&bar=baz'), { foo: 'bar', bar: 'baz' })
  t.deepEqual(qs.parse('foo2=bar2&baz2='), { foo2: 'bar2', baz2: '' })
  t.deepEqual(qs.parse('foo=bar&baz', { strictNullHandling: true }), { foo: 'bar', baz: null })
  t.deepEqual(qs.parse('foo=bar&baz'), { foo: 'bar', baz: '' })
  t.deepEqual(qs.parse('cht=p3&chd=t:60,40&chs=250x100&chl=Hello|World'), {
    cht: 'p3',
    chd: 't:60,40',
    chs: '250x100',
    chl: 'Hello|World',
  })
  t.end()
})

test('parse() comma handling', function (t) {
  t.test('comma: false', function (st) {
    st.deepEqual(qs.parse('a[]=b&a[]=c'), { a: ['b', 'c'] })
    st.deepEqual(qs.parse('a[0]=b&a[1]=c'), { a: ['b', 'c'] })
    st.deepEqual(qs.parse('a=b,c'), { a: 'b,c' })
    st.deepEqual(qs.parse('a=b&a=c'), { a: ['b', 'c'] })
    st.end()
  })

  t.test('comma: true', function (st) {
    st.deepEqual(qs.parse('a=b,c', { comma: true }), { a: ['b', 'c'] })
    st.deepEqual(qs.parse('a=b&a=c', { comma: true }), { a: ['b', 'c'] })
    st.end()
  })

  t.end()
})

test('parse() additional tests', function (t) {
  t.deepEqual(qs.parse('a[b][c]=d'), { a: { b: { c: 'd' } } })
  t.deepEqual(qs.parse('a[0][b]=c'), { a: [{ b: 'c' }] }) // Arrays are normalized
  t.deepEqual(qs.parse('a=b&a=c&a=d'), { a: ['b', 'c', 'd'] })
  t.end()
})
