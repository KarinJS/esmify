import { config } from 'dotenv'
// @ts-ignore
import env from 'dotenv/lib/env-options'
// @ts-ignore
import cli from 'dotenv/lib/cli-options'

config(
  Object.assign(
    {},
    env,
    cli(process.argv)
  )
)

export { }