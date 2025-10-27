# ESMify

> 将常用 CJS 包转换为 ESM 格式，大幅度缩减包体积

> [!IMPORTANT]
> **自动化与透明度声明**
>
> 本仓库所有模块的转换和发布流程均通过 GitHub Actions 实现自动化，所有操作日志和构建过程均可在仓库的 Actions 页面查看，确保完全透明。
>
> **使用风险提示**
>
> 转换后的模块虽然经过基础测试，但仍建议用户在生产环境使用前进行充分测试。由于模块转换的复杂性，我们无法保证转换后的模块与原模块 100% 兼容。用户在使用过程中遇到任何问题，本仓库及开发团队不承担任何责任。

## 简介

ESMify 是一个将 CommonJS 包转换成 ESM（ECMAScript Modules）模块的仓库，这是一项持续进行的计划，使用 vite+tsup 实现，旨在显著减小包的体积，提高应用性能。

## ✨ 特色功能

- 🚀 **大幅体积压缩**：平均减少 60-95% 的包体积
- 📦 **原生 ESM 支持**：完全兼容现代 JavaScript 生态
- 🔧 **无缝替换**：使用别名安装，无需修改任何代码
- 📝 **TypeScript 支持**：内置类型定义或兼容原有类型
- 🔄 **自动化流程**：通过 GitHub Actions 自动构建和发布
- 🧪 **质量保证**：所有包都经过基础测试验证

## 🎯 性能优势

- **更快的加载速度**：体积减小带来的直接好处
- **更小的 bundle**：减少最终应用的打包体积
- **更好的 Tree-shaking**：ESM 原生支持静态分析
- **现代化架构**：符合当前 JavaScript 生态标准

## 系统要求

- Node.js >= 18.0.0

## 包体积对比

以下是各个包转换前后的体积对比（数据参考自 [@pkg-size.dev](https://pkg-size.dev/)）：

> 特别声明: 此处的计算都是不计算`二进制`文件的体积

| 原始包名称      | 原始体积 | 转换后包名称             | 转换后体积 | 减少比例 | types |
| --------------- | -------- | ------------------------ | ---------- | -------- | ----- |
| [lodash-es]     | ~636KB   | [@karinjs/lodash]        | ~210KB     | ~67%     | ❌     |
| [express]       | ~2.2MB   | [@karinjs/express]       | ~828KB     | ~62%     | ❌     |
| [dotenv]        | ~76KB    | [@karinjs/dotenv]        | ~20kB      | ~73.7%   | ✅     |
| [jsonwebtoken]  | ~298KB   | [@karinjs/jsonwebtoken]  | ~141KB     | ~52.7%   | ✅     |
| [log4js] **🔥**  | ~519KB   | [@karinjs/log4js]        | ~225KB     | ~56.6%   | ✅     |
| [redis]         | ~991KB   | [@karinjs/redis]         | ~1MB       | ~0%      | ✅     |
| [sqlite3]       | ~6.9MB   | [@karinjs/sqlite3]       | ~2.1MB     | ~69.6%   | ✅     |
| [sqlite3-cjs]   | ~6.9MB   | [@karinjs/sqlite3-cjs]   | ~2.1MB     | ~69.6%   | ✅     |
| [moment]        | ~4.4MB   | [@karinjs/moment]        | ~526KB     | ~88%     | ✅     |
| [art-template]  | ~8.3MB   | [@karinjs/art-template]  | ~400KB     | ~95.2%   | ✅     |
| [node-schedule] | ~4.6MB   | [@karinjs/node-schedule] | ~323KB     | ~93%     | ✅     |
| [ws]            | ~147KB   | [@karinjs/ws]            | ~154KB     | ~0%      | ✅     |
| [axios]         | ~2.7MB   | [@karinjs/axios]         | ~100KB     | ~96.3%   | ✅     |
| [node-pty]      | ~8.4MB   | [@karinjs/node-pty]      | ~33KB      | ~96.3%   | ✅     |
| [qs] **🔥**      | ~307KB   | [@karinjs/qs]            | ~27KB      | ~91.2%   | ✅     |
| [long-timeout] **🔥** | ~8.1KB   | [@karinjs/long-timeout]  | ~2KB       | ~75.3%   | ✅     |

> **🔥 标记说明**：带有 🔥 标记的包表示进行了完全的 TypeScript + ESM + Node.js 18+ 重构，而非简单的打包器转译。

## 特别声明

对于`lodash`和`express`，推荐使用别名安装，因为需要处理类型问题。

```bash
npm install lodash@npm:@karinjs/lodash
npm install express@npm:@karinjs/express

# types
npm install @types/lodash
npm install @types/express
```

## 无缝升级指南

你可以通过以下方式无缝升级到 ESM 版本，无需修改任何代码：

### npm

```bash
npm install lodash@npm:@karinjs/lodash
```

### yarn

```bash
yarn add lodash@npm:@karinjs/lodash
```

### pnpm

```bash
pnpm add lodash@npm:@karinjs/lodash
```

这种方式可以让你在不修改任何代码的情况下，将依赖替换为 ESM 版本。例如，如果你的代码中使用了 `import _ from 'lodash'`，它会自动使用 `@karinjs/lodash` 的 ESM 版本。

## 📖 使用示例

### 直接使用

```bash
# 安装 ESM 版本的 lodash
npm install @karinjs/lodash
```

```javascript
// 在你的代码中正常使用
import _ from '@karinjs/lodash'

console.log(_.isArray([1, 2, 3])) // true
```

### 别名安装（推荐）

```bash
# 使用别名安装，保持原有的导入方式
npm install lodash@npm:@karinjs/lodash
```

```javascript
// 代码完全不需要修改
import _ from 'lodash'

console.log(_.isArray([1, 2, 3])) // true
```

### Express 应用示例

```bash
npm install express@npm:@karinjs/express
npm install @types/express
```

```javascript
import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

## package

> ![IMPORTANT]
> 版本号映射和一些备注。

<details>
<summary>lodash-es</summary>

> 此包的类型转换存在问题，请单独安装`@types/lodash`

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.1 | 4.17.21  |      |

</details>

<details>
<summary>express</summary>

> 此包的类型转换存在问题，请单独安装`@types/express`

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.0.3 | 4.18.2   |      |

</details>

<details>
<summary>dotenv</summary>

> 内置类型

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.2 | 16.3.1   |      |

</details>

<details>
<summary>jsonwebtoken</summary>

> 内置类型

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.1 | 9.0.2    |      |

</details>

<details>
<summary>log4js</summary>

> 内置类型
>
> **🔥 特别声明：此包做了完全的 TypeScript + ESM + Node.js 18+ 迁移，而不是利用打包器简单进行了转译。**
>
> - ✅ 完整的 TypeScript 重写，实现 100% 类型安全
> - ✅ 原生 ESM 模块系统支持
> - ✅ Node.js 18+ 现代化 API 适配
> - ✅ 零 `any` 类型，工业级类型安全标准
> - ✅ 完全兼容原有 API，无需修改代码
> - ✅ 性能优化，体积减少 56.6%

| 版本  | 原始版本 | 备注                                    |
| ----- | -------- | --------------------------------------- |
| 1.1.4 | 6.9.1    | 完全 TS+ESM+Node18 重构，非简单转译版本 |

</details>

<details>
<summary>redis</summary>

> 内置类型

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.3 | 4.6.11   |      |

</details>

<details>
<summary>sqlite3</summary>

> 内置类型
> 默认使用阿里云镜像源进行下载二进制

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 0.1.3 | 5.1.7    |      |

</details>

<details>
<summary>sqlite3-cjs</summary>

> 内置类型
> 默认使用阿里云镜像源进行下载二进制

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 0.1.0 | 5.1.7    |      |

</details>

<details>
<summary>moment</summary>

> 内置类型
> 仓库地址: <https://github.com/KarinJS/moment>

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.0 | 2.30.1   |      |

</details>

<details>
<summary>art-template</summary>

> 内置类型
> 仓库地址: <https://github.com/KarinJS/art-template>

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.0 | 4.13.2   |      |

</details>

<details>
<summary>node-schedule</summary>

> 内置类型
> 仓库地址: <https://github.com/KarinJS/node-schedule>

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.0 | 2.1.1    |      |

</details>

<details>
<summary>ws</summary>

> 内置类型

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.0 | 8.16.0   |      |

</details>

<details>
<summary>axios</summary>

> 内置类型

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.8 | 1.8.4    |      |
| 1.2.0 | 1.9.0    |      |

</details>

<details>
<summary>node-pty</summary>

> 提供多平台预编译二进制文件 默认使用阿里云镜像源进行下载
> 根据 `@homebridge/node-pty-prebuilt-multiarch` 进行转换

| 版本  | 原始版本 | 备注                       |
| ----- | -------- | -------------------------- |
| 1.0.4 | 0.12.0   | 提供多平台预编译二进制文件 |

</details>

<details>
<summary>form-data</summary>

> 内置类型

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.0.0 | 4.0.1    |      |

</details>

<details>
<summary>yaml</summary>

> 内置类型

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.0.0 | 2.7.1    |      |

</details>

<details>
<summary>qs</summary>

> 内置类型
>
> **🔥 特别声明：此包做了完全的 TypeScript + ESM + Node.js 18+ 迁移，而不是利用打包器简单进行了转译。**
>
> - ✅ 完整的 TypeScript 重写，实现 100% 类型安全
> - ✅ 原生 ESM 模块系统支持  
> - ✅ Node.js 18+ 现代化 API 适配
> - ✅ 零 `any` 类型，工业级类型安全标准
> - ✅ 完全兼容原有 API，无需修改代码
> - ✅ 性能优化，体积减少 91.2%
> - ✅ 包含完整的单元测试，使用 tsx + tape 现代化测试框架

| 版本  | 原始版本 | 备注                                      |
| ----- | -------- | ----------------------------------------- |
| 0.0.1 | 6.14.0   | 完全 TS+ESM+Node18 重构，非简单转译版本 |

</details>

<details>
<summary>long-timeout</summary>

> 内置类型
>
> **🔥 特别声明：此包做了完全的 TypeScript + ESM + Node.js 18+ 迁移，而不是利用打包器简单进行了转译。**
>
> - ✅ 完整的 TypeScript 重写，实现 100% 类型安全
> - ✅ 原生 ESM 模块系统支持
> - ✅ Node.js 18+ 现代化 API 适配
> - ✅ 突破 Node.js 原生定时器 24.8 天限制，支持任意长度的定时器
> - ✅ 完全兼容原有 API，无需修改代码
> - ✅ 零依赖，体积减少 75.3%
> - ✅ 功能测试验证，与原包 100% 兼容

| 版本  | 原始版本 | 备注                                      |
| ----- | -------- | ----------------------------------------- |
| 0.0.1 | 0.1.1    | 完全 TS+ESM+Node18 重构，非简单转译版本 |

</details>

## ❓ 常见问题 (FAQ)

### Q: 转换后的包是否与原包 100% 兼容？

A: 我们努力保持最高的兼容性，但由于转换的复杂性，无法保证 100% 兼容。建议在生产环境使用前进行充分测试。

### Q: 为什么有些包的体积没有明显减少？

A: 一些包（如 `redis`、`ws`）本身已经比较精简，或者包含大量必要的功能代码，因此体积优化空间有限。

### Q: 如何处理类型问题？

A: 大多数包都内置了类型定义。对于 `lodash` 和 `express`，建议单独安装对应的 `@types` 包。

### Q: 是否可以在现有项目中直接替换？

A: 推荐使用别名安装的方式，这样可以在不修改任何代码的情况下进行替换。

### Q: 如何确保包的可靠性？

A: 所有包都通过 GitHub Actions 自动构建，构建过程完全透明。同时，我们建议用户在关键业务场景中进行充分测试。

### Q: 如何使用 init 脚本快速创建新包？

A: 运行 `pnpm run init <package-name>` 即可自动创建完整的包结构。脚本会自动下载原包、生成配置文件、设置构建环境，大大简化了新包的创建流程。

### Q: init 脚本创建的包需要手动修改哪些内容？

A: 主要需要修改 `src/index.ts` 文件来实现具体的转换逻辑。其他配置文件（package.json、tsconfig.json、构建配置等）已经预配置好，通常无需修改。

## 参与开发

如果你想要参与开发，请按照以下步骤进行：

### 环境要求

- Node.js >= 18.0.0
- pnpm v9.x

### 安装依赖

```bash
pnpm install
```

### 新增一个包

#### 🚀 快速开始 - 使用 init 脚本

我们提供了一个自动化脚本来快速创建新包的基础结构：

```bash
pnpm run init <package-name>
```

**参数说明：**

- `<package-name>`：要转换的 npm 包名称（不带 @karinjs/ 前缀）

#### 📝 完整示例：新增 qs 包

以下是完整的新增包流程，以 `qs` 包为例：

##### 1. 运行 init 脚本

```bash
pnpm run init qs
```

##### 2. 脚本自动完成的操作

此命令会自动创建完整的项目结构：

```
packages/qs/
├── package.json          # 包配置文件
├── tsconfig.json         # TypeScript 配置
├── tsdown.config.ts      # 构建配置 (推荐)
├── vite.config.ts        # 可选的 Vite 配置  
├── src/
│   └── index.ts          # 主入口文件
├── lib/                  # 原始包文件 (自动下载)
└── types/                # 类型定义文件 (如果存在)
```

**自动配置内容：**

- ✅ **package.json**：预配置 @karinjs/qs 包名、版本、脚本等
- ✅ **TypeScript 配置**：包含现代化的 TS 配置
- ✅ **构建工具**：tsdown (推荐) 或 vite/tsup 配置
- ✅ **依赖下载**：自动安装原始包作为开发依赖
- ✅ **发布配置**：更新 release-please 配置文件
- ✅ **类型支持**：自动检测并配置类型定义

##### 3. 开发转换逻辑

编辑 `packages/qs/src/index.ts` 文件：

```typescript
// packages/qs/src/index.ts

// 导入原始包的功能
import originalQs from 'qs'

// 重新导出或转换 API
export const parse = originalQs.parse
export const stringify = originalQs.stringify
export { formats } from 'qs'

// 默认导出
export default {
  parse,
  stringify,
  formats: originalQs.formats
}

// 导出类型 (如果需要自定义)
export type * from 'qs'
```

##### 4. 构建和测试

```bash
# 进入包目录
cd packages/qs

# 构建包
pnpm build

# 测试包功能
node -e "
import qs from './dist/index.mjs'
console.log(qs.parse('foo=bar&baz=qux'))
"
```

##### 5. 添加测试 (可选但推荐)

创建测试文件 `packages/qs/test/index.test.ts`：

```typescript
import test from 'tape'
import * as qs from '../src/index.js'

test('basic functionality', (t) => {
  const result = qs.parse('foo=bar&baz=qux')
  t.deepEqual(result, { foo: 'bar', baz: 'qux' })
  t.end()
})
```

##### 6. 更新文档

在根目录 `README.md` 中添加新包的信息：

- 更新包体积对比表格
- 添加包详情说明
- 添加使用示例

#### 🛠️ init 脚本的高级功能

**支持的配置选项：**

- 自动检测原包的 TypeScript 支持
- 根据包类型选择合适的构建工具
- 预配置常见的包转换模板
- 自动处理复杂依赖关系

**生成的文件模板：**

- **简单转换**：直接重新导出原包 API
- **类型增强**：添加完整的 TypeScript 类型
- **功能增强**：优化 API 设计和性能
- **完全重写**：基于现代标准重新实现

#### 💡 最佳实践建议

1. **优先使用 tsdown**：现代化、快速、体积小
2. **保持 API 兼容性**：确保与原包 100% 兼容
3. **添加类型定义**：提供完整的 TypeScript 支持
4. **编写测试**：验证转换后的功能正确性
5. **性能优化**：利用 ESM 的优势减少包体积
4. 更新 `.release-please-config.json` 和 `.release-please-manifest.json`
5. 自动安装原始包作为开发依赖

#### 📋 传统开发流程 (手动方式)

如果你不使用 init 脚本，也可以手动创建包：

1. **创建目录结构**：`mkdir -p packages/<name>/src`
2. **编写转换逻辑**：修改 `packages/<name>/src/index.ts` 文件
3. **配置构建**：创建 `package.json`、`tsconfig.json` 等配置文件
4. **构建包**：运行 `pnpm run build -F @karinjs/<name>`
5. **测试验证**：测试包的功能和体积
6. **提交代码**：发起 Pull Request

**推荐使用 init 脚本**，它能自动完成大部分繁琐的配置工作。

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复问题
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

### 版本发布

版本发布通过 [Release Please](https://github.com/googleapis/release-please) 自动管理，当代码合并到主分支时会自动创建发布 PR。

## 🤝 贡献者

感谢所有为这个项目做出贡献的开发者！

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🔗 相关链接

- [GitHub 仓库](https://github.com/KarinJS/esmify)
- [NPM 组织](https://www.npmjs.com/org/karinjs)
- [问题反馈](https://github.com/KarinJS/esmify/issues)
- [贡献指南](https://github.com/KarinJS/esmify/blob/main/CONTRIBUTING.md)

[qs]: https://www.npmjs.com/package/qs
[long-timeout]: https://www.npmjs.com/package/long-timeout

[@karinjs/lodash]: https://www.npmjs.com/package/@karinjs/lodash
4. 建议在非关键业务场景下使用，或在充分测试后用于生产环境。
5. 如遇到问题，建议回退使用原模块，或自行修复问题。

[lodash-es]: https://www.npmjs.com/package/lodash-es
[express]: https://www.npmjs.com/package/express
[dotenv]: https://www.npmjs.com/package/dotenv
[jsonwebtoken]: https://www.npmjs.com/package/jsonwebtoken
[log4js]: https://www.npmjs.com/package/log4js
[redis]: https://www.npmjs.com/package/redis
[sqlite3]: https://www.npmjs.com/package/sqlite3
[moment]: https://www.npmjs.com/package/moment
[@karinjs/qs]: https://www.npmjs.com/package/@karinjs/qs
[@karinjs/long-timeout]: https://www.npmjs.com/package/@karinjs/long-timeout
[axios]: https://www.npmjs.com/package/axios
[node-pty]: https://www.npmjs.com/package/node-pty

[@karinjs/express]: https://www.npmjs.com/package/@karinjs/express
[@karinjs/dotenv]: https://www.npmjs.com/package/@karinjs/dotenv
[@karinjs/jsonwebtoken]: https://www.npmjs.com/package/@karinjs/jsonwebtoken
[@karinjs/log4js]: https://www.npmjs.com/package/@karinjs/log4js
[@karinjs/redis]: https://www.npmjs.com/package/@karinjs/redis
[@karinjs/sqlite3]: https://www.npmjs.com/package/@karinjs/sqlite3
[@karinjs/moment]: https://www.npmjs.com/package/@karinjs/moment
[@karinjs/art-template]: https://www.npmjs.com/package/@karinjs/art-template
[@karinjs/node-schedule]: https://www.npmjs.com/package/@karinjs/node-schedule
[@karinjs/ws]: https://www.npmjs.com/package/@karinjs/ws
[@karinjs/axios]: https://www.npmjs.com/package/@karinjs/axios
[@karinjs/node-pty]: https://www.npmjs.com/package/@karinjs/node-pty
