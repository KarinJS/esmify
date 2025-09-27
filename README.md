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
> 仓库地址: https://github.com/KarinJS/moment

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.0 | 2.30.1   |      |

</details>

<details>
<summary>art-template</summary>

> 内置类型
> 仓库地址: https://github.com/KarinJS/art-template

| 版本  | 原始版本 | 备注 |
| ----- | -------- | ---- |
| 1.1.0 | 4.13.2   |      |

</details>

<details>
<summary>node-schedule</summary>

> 内置类型
> 仓库地址: https://github.com/KarinJS/node-schedule

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

要新增一个包，请运行以下命令：

```bash
pnpm run init <name>
```

其中 `<name>` 是你要转换的包的名称。例如，要转换 `axios` 包，请运行：

```bash
pnpm run init axios
```

此命令会自动创建必要的目录结构和配置文件：

1. 在 `packages/<name>` 目录下创建基本文件结构
2. 生成 `package.json` 配置
3. 生成 `vite.config.ts` 和 `tsup.config.ts` 构建配置
4. 更新 `.release-please-config.json` 和 `.release-please-manifest.json`
5. 自动安装原始包作为开发依赖

### 开发流程

1. 修改 `packages/<name>/src/index.ts` 文件，编写转换逻辑
2. 修改 `packages/<name>/index.js` 文件
3. 运行 `pnpm run build -F @karinjs/<name>` 构建包
4. 测试包的功能和体积
5. 提交代码并发起 Pull Request

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

## 免责声明

1. 本仓库提供的所有模块均为自动化转换生成，可能存在与原模块不完全兼容的情况。
2. 用户在使用这些模块时，应当自行进行充分测试，确保满足生产环境需求。
3. 本仓库及开发团队不对使用这些模块产生的任何问题负责。
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
[art-template]: https://www.npmjs.com/package/art-template
[node-schedule]: https://www.npmjs.com/package/node-schedule
[ws]: https://www.npmjs.com/package/ws
[axios]: https://www.npmjs.com/package/axios
[node-pty]: https://www.npmjs.com/package/node-pty
[form-data]: https://www.npmjs.com/package/form-data
[yaml]: https://www.npmjs.com/package/yaml

[@karinjs/lodash]: https://www.npmjs.com/package/@karinjs/lodash
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
[@karinjs/form-data]: https://www.npmjs.com/package/@karinjs/form-data
[@karinjs/yaml]: https://www.npmjs.com/package/@karinjs/yaml
