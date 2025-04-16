import * as jsonwebtoken from 'jsonwebtoken'

const {
  sign,
  verify,
  decode,
} = jsonwebtoken

export {
  sign,
  verify,
  decode,
  jsonwebtoken as default
}

export type {
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
  SignOptions,
  VerifyOptions,
  DecodeOptions,
  VerifyErrors,
  VerifyCallback,
  SignCallback,
  JwtHeader,
  JwtPayload,
  Jwt,
  Algorithm,
  SigningKeyCallback,
  GetPublicKeyOrSecret,
  PublicKey,
  PrivateKey,
  Secret,
} from 'jsonwebtoken'
