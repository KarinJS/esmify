import ts from 'typescript'
import { defineConfig } from 'tsdown/config'

/**
 * 移除 debug 模块的导入和所有调用（使用 TypeScript Compiler API）
 */
function removeDebugPlugin (): any {
  return {
    name: 'remove-debug',
    enforce: 'pre',

    transform (code: string, id: string) {
      // 只处理 TypeScript/JavaScript 文件
      if (!/\.[tj]sx?$/.test(id)) return null

      // 快速检查
      if (!code.includes('debug') && !code.includes('DEBUG')) return null

      // 解析为 AST
      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.Latest,
        true,
        id.endsWith('.tsx') || id.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      )

      const debugIdentifiers = new Set<string>()
      let modified = false

      // 转换函数
      const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        return (sourceFile) => {
          const visitor = (node: ts.Node): ts.Node | undefined => {
            // 1. 移除 debug 模块的导入
            if (ts.isImportDeclaration(node)) {
              const moduleSpecifier = node.moduleSpecifier
              if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === 'debug') {
                // 记录导入的标识符
                if (node.importClause?.name) {
                  debugIdentifiers.add(node.importClause.name.text)
                }
                modified = true
                return undefined // 移除节点
              }
            }

            // 2. 移除 debug 实例创建的变量声明
            if (ts.isVariableStatement(node)) {
              const declarations = node.declarationList.declarations.filter(decl => {
                if (decl.initializer && ts.isCallExpression(decl.initializer)) {
                  const callee = decl.initializer.expression
                  if (ts.isIdentifier(callee) && debugIdentifiers.has(callee.text)) {
                    // 记录新的 debug 实例名称
                    if (ts.isIdentifier(decl.name)) {
                      debugIdentifiers.add(decl.name.text)
                    }
                    modified = true
                    return false // 过滤掉这个声明
                  }
                }
                return true
              })

              if (declarations.length === 0) {
                return undefined // 移除整个语句
              }

              if (declarations.length < node.declarationList.declarations.length) {
                return ts.factory.updateVariableStatement(
                  node,
                  node.modifiers,
                  ts.factory.updateVariableDeclarationList(
                    node.declarationList,
                    declarations
                  )
                )
              }
            }

            // 3. 移除 debug 函数调用的表达式语句
            if (ts.isExpressionStatement(node)) {
              const expr = node.expression
              if (ts.isCallExpression(expr)) {
                const callee = expr.expression
                if (ts.isIdentifier(callee) && debugIdentifiers.has(callee.text)) {
                  modified = true
                  return undefined // 移除节点
                }
              }
            }

            return ts.visitEachChild(node, visitor, context)
          }

          return ts.visitNode(sourceFile, visitor) as ts.SourceFile
        }
      }

      // 应用转换
      const result = ts.transform(sourceFile, [transformer])
      const transformedSourceFile = result.transformed[0]

      if (!modified) {
        result.dispose()
        return null
      }

      // 生成代码
      const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
      })

      const output = printer.printFile(transformedSourceFile)
      result.dispose()

      return {
        code: output,
        map: null,
      }
    },
  }
}

export default defineConfig({
  entry: ['./src/index.ts'],
  outExtensions: (context) => {
    if (context.format === 'es') {
      return {
        js: '.mjs',
        dts: '.d.ts',
      }
    }

    return { js: '.js', dts: '.d.ts' }
  },
  dts: true,
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  sourcemap: false,
  outDir: 'dist',
  clean: true,
  treeshake: true,
  shims: true,
  plugins: [
    // 移除所有 debug 相关的代码
    removeDebugPlugin(),
  ],
})
