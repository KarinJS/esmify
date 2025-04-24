import { WebSocket } from 'ws'

export {
  WebSocket,
  WebSocketServer,
  createWebSocketStream,
} from 'ws'

export default WebSocket
export type {
  Server,
  AddressInfo,
  CertMeta,
  ClientOptions,
  CloseEvent,
  Data,
  ErrorEvent,
  Event,
  EventListenerOptions,
  FinishRequestCallback,
  MessageEvent,
  PerMessageDeflateOptions,
  RawData,
  ServerOptions,
  VerifyClientCallbackAsync,
  VerifyClientCallbackSync,
} from 'ws'
