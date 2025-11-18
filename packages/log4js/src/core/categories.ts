/**
 * 日志分类管理模块
 * 用于管理和配置日志分类，包括继承关系、appender 分配和日志级别
 */
import debug from 'debug'
import { levels } from './levels'
import { appenders } from '../appenders'
import { configuration } from './configuration'

import type { LveelMethods } from './levels'
import type { Config, CategoryConfig } from '../appenders'
import type { AppenderFunction } from '../appenders/base'

/** 调试日志函数 */
const debugLog = debug('log4js:categories')

/**
 * categories 值的类型
 */
export interface CategoryMapValue {
  /** Appender 函数列表 */
  appenders: AppenderFunction[]
  /** 日志级别函数 */
  level: LveelMethods
  /** 是否启用调用栈 */
  enableCallStack: boolean
}

/** 分类存储 Map */
const categories = new Map<string, CategoryMapValue>()

/**
 * 为分类添加继承的配置
 * 包括从父分类继承额外的 appender 和级别（如果当前分类未设置）
 * 这是递归的，因此每个父分类也会加载继承的 appender
 * 如果分类的 inherit=false，则阻止继承
 *
 * @param config - 配置对象
 * @param category - 子分类配置
 * @param categoryName - 分类名称（点分隔的路径）
 */
function inheritFromParent (
  config: Config,
  category: CategoryConfig<any>,
  categoryName: string
): void {
  if (!category) return
  if (category.inherit === false) return
  const lastDotIndex = categoryName.lastIndexOf('.')
  if (lastDotIndex < 0) return // 分类不是子分类
  const parentCategoryName = categoryName.slice(0, lastDotIndex)
  let parentCategory = config.categories[parentCategoryName]

  if (!parentCategory) {
    // 父分类缺失，隐式创建它，以便它可以从其父分类继承
    parentCategory = { inherit: true, appenders: [] } as unknown as CategoryConfig<any> // 不理解 但尊重...?
  }

  // 确保在将父分类的属性拉取到子分类之前，父分类已处理好继承
  inheritFromParent(config, parentCategory, parentCategoryName)

  // 如果父分类不在配置中（因为我们刚刚在上面创建了它），
  // 并且它继承了有效的配置，则将其添加到 config.categories
  if (
    !config.categories[parentCategoryName] &&
    parentCategory.appenders &&
    parentCategory.appenders.length &&
    parentCategory.level
  ) {
    config.categories[parentCategoryName] = parentCategory
  }

  category.appenders = category.appenders || []
  category.level = category.level || parentCategory.level

  // 合并来自父分类的 appender（父分类已经持有其继承的 appender）
  parentCategory.appenders.forEach((ap) => {
    if (!category.appenders.includes(ap)) {
      category.appenders.push(ap)
    }
  })
  category.parent = parentCategory
}

/**
 * 遍历配置中的所有分类，将配置从父分类拉取到子分类
 * 包括继承的 appender 和级别（当级别未设置时）
 * 如果分类的 inherit=false，则跳过继承
 *
 * @param config - 配置对象
 */
configuration.addPreProcessingListener((config: Config) => {
  if (!config.categories) return
  const categoryNames = Object.keys(config.categories)
  categoryNames.forEach((name) => {
    const category = config.categories[name]
    // 为此分类添加继承的 appender 和级别
    inheritFromParent(config, category, name)
  })

  debugLog(`${JSON.stringify(config.categories, null, 2)} 个分类继承完成`)
})

configuration.addListener((config: Config) => {
  configuration.throwExceptionIf(
    config,
    configuration.not(configuration.anObject(config.categories)),
    '必须有一个类型为 object 的 "categories" 属性。'
  )

  const categoryNames = Object.keys(config.categories)
  configuration.throwExceptionIf(
    config,
    configuration.not(categoryNames.length),
    '必须至少定义一个分类。'
  )

  categoryNames.forEach((name) => {
    const category = config.categories[name]
    configuration.throwExceptionIf(
      config,
      [
        configuration.not(category.appenders),
        configuration.not(category.level),
      ],
      `分类 "${name}" 无效（必须是具有 "appenders" 和 "level" 属性的对象）`
    )

    configuration.throwExceptionIf(
      config,
      configuration.not(Array.isArray(category.appenders)),
      `分类 "${name}" 无效（appenders 必须是 appender 名称的数组）`
    )

    configuration.throwExceptionIf(
      config,
      configuration.not(category.appenders.length),
      `分类 "${name}" 无效（appenders 必须至少包含一个 appender 名称）`
    )

    if (Object.prototype.hasOwnProperty.call(category, 'enableCallStack')) {
      configuration.throwExceptionIf(
        config,
        typeof category.enableCallStack !== 'boolean',
        `分类 "${name}" 无效（enableCallStack 必须是布尔类型）`
      )
    }

    category.appenders.forEach((appender: string) => {
      configuration.throwExceptionIf(
        config,
        configuration.not(appenders.get(appender)),
        `分类 "${name}" 无效（appender "${appender}" 未定义）`
      )
    })

    configuration.throwExceptionIf(
      config,
      configuration.not(levels.getLevel(category.level)),
      `分类 "${name}" 无效（级别 "${category.level}" 无法识别；` +
      `有效级别为 ${levels.levels.join('、')}）`
    )
  })

  configuration.throwExceptionIf(
    config,
    configuration.not(config.categories.default),
    '必须定义一个 "default" 分类。'
  )
})

/**
 * 设置分类配置
 * @param config - 配置对象
 */
const setup = (config?: Config): void => {
  categories.clear()
  if (!config) {
    return
  }

  const categoryNames = Object.keys(config.categories)
  categoryNames.forEach((name) => {
    const category = config.categories[name]
    const categoryAppenders: AppenderFunction[] = []
    category.appenders.forEach((appender) => {
      const res = appenders.get(appender)
      if (!res) return
      categoryAppenders.push(res)
      debugLog(`创建分类 ${name}`)
      categories.set(name, {
        appenders: categoryAppenders,
        level: levels.getLevel(category.level),
        enableCallStack: category.enableCallStack || false,
      })
    })
  })
}

/**
 * 初始化分类系统
 */
const init = (): void => {
  setup()
}
init()

configuration.addListener(setup)

/**
 * 获取指定分类的配置
 * 如果分类不存在，将从父分类或默认分类克隆配置
 *
 * @param category - 分类名称
 * @returns 分类配置
 */
const configForCategory = (category: string) => {
  debugLog(`configForCategory: 搜索 ${category} 的配置`)
  if (categories.has(category)) {
    debugLog(`configForCategory: ${category} 存在于配置中，返回它`)
    return categories.get(category)!
  }

  let sourceCategoryConfig: CategoryMapValue
  if (category.indexOf('.') > 0) {
    debugLog(`configForCategory: ${category} 有层级关系，从父分类克隆`)
    sourceCategoryConfig = {
      ...configForCategory(category.slice(0, category.lastIndexOf('.'))),
    }
  } else {
    if (!categories.has('default')) {
      debugLog('configForCategory: 默认分类不存在，创建一个默认的 OFF 分类')
      // @ts-ignore 不理解... 但尊重...?
      setup({ categories: { default: { appenders: ['out'], level: 'OFF' } } })
    }
    debugLog('configForCategory: 克隆默认分类')
    sourceCategoryConfig = { ...categories.get('default')! }
  }
  categories.set(category, sourceCategoryConfig)
  return sourceCategoryConfig
}

/**
 * 获取指定分类的 appender 列表
 * @param category - 分类名称
 * @returns appender 列表
 */
const appendersForCategory = (category: string): AppenderFunction[] => {
  return configForCategory(category).appenders
}

/**
 * 获取指定分类的日志级别
 * @param category - 分类名称
 * @returns 日志级别
 */
const getLevelForCategory = (category: string): LveelMethods => {
  return configForCategory(category).level
}

/**
 * 设置指定分类的日志级别
 * @param category - 分类名称
 * @param level - 日志级别
 */
const setLevelForCategory = (category: string, level: LveelMethods): void => {
  configForCategory(category).level = level
}

/**
 * 获取指定分类是否启用调用栈
 * @param category - 分类名称
 * @returns 是否启用调用栈
 */
const getEnableCallStackForCategory = (category: string): boolean => {
  return configForCategory(category).enableCallStack === true
}

/**
 * 设置指定分类是否启用调用栈
 * @param category - 分类名称
 * @param useCallStack - 是否启用调用栈
 */
const setEnableCallStackForCategory = (
  category: string,
  useCallStack: boolean
): void => {
  configForCategory(category).enableCallStack = useCallStack
}

export {
  init,
  categories,
  appendersForCategory,
  getLevelForCategory,
  setLevelForCategory,
  getEnableCallStackForCategory,
  setEnableCallStackForCategory,
}
