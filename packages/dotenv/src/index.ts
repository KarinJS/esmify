import * as dotenv from 'dotenv'

const {
  configDotenv,
  // @ts-ignore
  _configVault, _parseVault,
  config,
  decrypt,
  parse,
  populate
} = dotenv

export {
  configDotenv,
  _configVault, _parseVault,
  config,
  decrypt,
  parse,
  populate,
  dotenv as default
}

export type {
  DotenvParseOutput,
  DotenvConfigOptions,
  DotenvConfigOutput,
  DotenvPopulateOptions,
  DotenvPopulateInput,
} from 'dotenv'
