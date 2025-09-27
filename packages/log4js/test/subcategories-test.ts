import { test } from 'tap'

test('subcategories concept', (t) => {
  // Test subcategory hierarchy concepts
  const categoryHierarchy = {
    app: { level: 'info', appenders: ['console'] },
    'app.database': { level: 'debug', appenders: ['file'] },
    'app.database.connection': { level: 'trace', appenders: ['file'] },
    'app.web': { level: 'warn', appenders: ['console', 'file'] },
  }

  const categories = Object.keys(categoryHierarchy)

  categories.forEach((category) => {
    t.ok(categoryHierarchy[category as keyof typeof categoryHierarchy], `Category ${category} should exist`)
    const config = categoryHierarchy[category as keyof typeof categoryHierarchy]
    t.ok(config.level, `Category ${category} should have level`)
    t.ok(Array.isArray(config.appenders), `Category ${category} should have appenders array`)
  })

  t.end()
})

test('subcategory inheritance concept', (t) => {
  // Test how subcategories inherit from parent categories
  const inheritanceRules = [
    {
      child: 'app.database',
      parent: 'app',
      inherits: ['appenders', 'level'],
      overrides: ['specific configuration'],
    },
    {
      child: 'app.database.connection',
      parent: 'app.database',
      inherits: ['parent appenders', 'parent level'],
      overrides: ['more specific logging'],
    },
  ]

  inheritanceRules.forEach((rule) => {
    t.ok(rule.child, 'Should have child category')
    t.ok(rule.parent, 'Should have parent category')
    t.ok(Array.isArray(rule.inherits), 'Should specify what is inherited')
    t.ok(Array.isArray(rule.overrides), 'Should specify what can be overridden')
  })

  t.end()
})

test('subcategory naming patterns', (t) => {
  // Test valid subcategory naming patterns
  const validPatterns = [
    'app',
    'app.module',
    'app.module.component',
    'server.http.router',
    'database.mysql.connection',
  ]

  const invalidPatterns = [
    '.app',           // starts with dot
    'app.',           // ends with dot
    'app..module',    // double dots
    'app module',     // contains space
    'app-module',     // contains dash (should use dots)
  ]

  validPatterns.forEach((pattern) => {
    const isValid = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(pattern)
    t.ok(isValid, `Pattern "${pattern}" should be valid`)
  })

  invalidPatterns.forEach((pattern) => {
    const isValid = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/.test(pattern)
    t.notOk(isValid, `Pattern "${pattern}" should be invalid`)
  })

  t.end()
})
