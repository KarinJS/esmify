import * as configuration from './configuration'

const validColours = [
  'white',
  'grey',
  'black',
  'blue',
  'cyan',
  'green',
  'magenta',
  'red',
  'yellow',
]

interface LevelConfig {
  value: number
  colour: string
}

export default class Level {
  level: number
  levelStr: string
  colour: string
  static levels: Level[] = []

  constructor (level: number, levelStr: string, colour: string) {
    this.level = level
    this.levelStr = levelStr
    this.colour = colour
  }

  toString (): string {
    return this.levelStr
  }

  /**
   * converts given String to corresponding Level
   * @param sArg -- String value of Level OR Log4js.Level
   * @param defaultLevel -- default Level, if no String representation
   * @return Level
   */
  static getLevel (sArg?: Level | string | { levelStr: string }, defaultLevel?: Level): Level | undefined {
    if (!sArg) {
      return defaultLevel
    }

    if (sArg instanceof Level) {
      return sArg
    }

    // a json-serialised level won't be an instance of Level (see issue #768)
    if (sArg instanceof Object && sArg.levelStr) {
      sArg = sArg.levelStr
    }

    return (Level as unknown as Record<string, Level>)[sArg.toString().toUpperCase()] || defaultLevel
  }

  static addLevels (customLevels?: Record<string, LevelConfig>): void {
    if (customLevels) {
      const levels = Object.keys(customLevels)
      levels.forEach((l) => {
        const levelStr = l.toUpperCase()
        const newLevel = new Level(
          customLevels[l].value,
          levelStr,
          customLevels[l].colour
        );
        (Level as unknown as Record<string, Level>)[levelStr] = newLevel
        const existingLevelIndex = Level.levels.findIndex(
          (lvl) => lvl.levelStr === levelStr
        )
        if (existingLevelIndex > -1) {
          Level.levels[existingLevelIndex] = newLevel
        } else {
          Level.levels.push(newLevel)
        }
      })
      Level.levels.sort((a, b) => a.level - b.level)
    }
  }

  isLessThanOrEqualTo (otherLevel: Level | string): boolean {
    let level = otherLevel
    if (typeof otherLevel === 'string') {
      level = Level.getLevel(otherLevel)!
    }
    return this.level <= (level as Level).level
  }

  isGreaterThanOrEqualTo (otherLevel: Level | string): boolean {
    let level = otherLevel
    if (typeof otherLevel === 'string') {
      level = Level.getLevel(otherLevel)!
    }
    return this.level >= (level as Level).level
  }

  isEqualTo (otherLevel: Level | string): boolean {
    let level = otherLevel
    if (typeof otherLevel === 'string') {
      level = Level.getLevel(otherLevel)!
    }
    return this.level === (level as Level).level
  }
}

Level.addLevels({
  ALL: { value: Number.MIN_VALUE, colour: 'grey' },
  TRACE: { value: 5000, colour: 'blue' },
  DEBUG: { value: 10000, colour: 'cyan' },
  INFO: { value: 20000, colour: 'green' },
  WARN: { value: 30000, colour: 'yellow' },
  ERROR: { value: 40000, colour: 'red' },
  FATAL: { value: 50000, colour: 'magenta' },
  MARK: { value: 9007199254740992, colour: 'grey' }, // 2^53
  OFF: { value: Number.MAX_VALUE, colour: 'grey' },
})

configuration.addListener((config) => {
  const levelConfig = config.levels
  if (levelConfig) {
    configuration.throwExceptionIf(
      config,
      configuration.not(configuration.anObject(levelConfig)),
      'levels must be an object'
    )
    const newLevels = Object.keys(levelConfig)
    newLevels.forEach((l) => {
      configuration.throwExceptionIf(
        config,
        configuration.not(configuration.validIdentifier(l)),
        `level name "${l}" is not a valid identifier (must start with a letter, only contain A-Z,a-z,0-9,_)`
      )
      configuration.throwExceptionIf(
        config,
        configuration.not(configuration.anObject(levelConfig[l])),
        `level "${l}" must be an object`
      )
      configuration.throwExceptionIf(
        config,
        configuration.not(levelConfig[l].value),
        `level "${l}" must have a 'value' property`
      )
      configuration.throwExceptionIf(
        config,
        configuration.not(configuration.anInteger(levelConfig[l].value)),
        `level "${l}".value must have an integer value`
      )
      configuration.throwExceptionIf(
        config,
        configuration.not(levelConfig[l].colour),
        `level "${l}" must have a 'colour' property`
      )
      configuration.throwExceptionIf(
        config,
        configuration.not(validColours.indexOf(levelConfig[l].colour) > -1),
        `level "${l}".colour must be one of ${validColours.join(', ')}`
      )
    })
  }
})

configuration.addListener((config) => {
  Level.addLevels(config.levels)
})

// Create a Levels object that matches the type definition
const levelMap = Level as unknown as Record<string, Level>
export const levels = {
  ALL: levelMap.ALL,
  MARK: levelMap.MARK,
  TRACE: levelMap.TRACE,
  DEBUG: levelMap.DEBUG,
  INFO: levelMap.INFO,
  WARN: levelMap.WARN,
  ERROR: levelMap.ERROR,
  FATAL: levelMap.FATAL,
  OFF: levelMap.OFF,
  levels: Level.levels,
  getLevel: Level.getLevel,
  addLevels: Level.addLevels,
}

// Also export Level class for type checking
export { Level }
