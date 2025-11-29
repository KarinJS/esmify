const percentTwenties = /%20/g

export enum Format {
  RFC1738 = 'RFC1738',
  RFC3986 = 'RFC3986',
}

export type Formatter = (value: string) => string

export interface Formatters {
  RFC1738: Formatter
  RFC3986: Formatter
}

export const formatters: Formatters = {
  RFC1738: function (value: string): string {
    return value.replace(percentTwenties, '+')
  },
  RFC3986: function (value: string): string {
    return String(value)
  },
}

export const defaultFormat: Format = Format.RFC3986

export const RFC1738 = Format.RFC1738
export const RFC3986 = Format.RFC3986
