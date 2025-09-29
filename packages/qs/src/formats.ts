const percentTwenties = /%20/g

export const Format = {
  RFC1738: 'RFC1738',
  RFC3986: 'RFC3986',
} as const

export type FormatType = typeof Format[keyof typeof Format]

export const formatters = {
  RFC1738: (value: string): string => {
    return value.replace(percentTwenties, '+')
  },
  RFC3986: (value: string): string => {
    return String(value)
  },
} as const

export const RFC1738 = Format.RFC1738
export const RFC3986 = Format.RFC3986
export const defaultFormat = Format.RFC3986

export default {
  default: defaultFormat,
  formatters,
  RFC1738,
  RFC3986,
}
