import * as dotenv from 'dotenv'

import {
  configDotenv,
  config,
  decrypt,
  parse,
  populate,
} from 'dotenv'

const {
  // @ts-ignore
  _configVault, _parseVault,
} = dotenv

export {
  configDotenv,
  _configVault, _parseVault,
  config,
  decrypt,
  parse,
  populate,
  dotenv as default,
}

export type {
  DotenvParseOutput,
  DotenvConfigOptions,
  DotenvConfigOutput,
  DotenvPopulateOptions,
  DotenvPopulateInput,
} from 'dotenv'
