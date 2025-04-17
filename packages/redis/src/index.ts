import * as redis from 'redis'
import {
  createClient,
  createCluster,
} from '@redis/client'
export * from '@redis/client'
export * from '@redis/bloom'
export * from '@redis/graph'
export * from '@redis/json'
export * from '@redis/search'
export * from '@redis/time-series'

const {
  AbortError,
  AggregateGroupByReducers,
  AggregateSteps,
  ClientClosedError,
  ClientOfflineError,
  ConnectionTimeoutError,
  DisconnectsClientError,
  ErrorReply,
  GeoReplyWith,
  Graph,
  MultiErrorReply,
  ReconnectStrategyError,
  RedisFlushModes,
  RedisSearchLanguages,
  RootNodesUnavailableError,
  SchemaFieldTypes,
  SchemaTextFieldPhonetics,
  SocketClosedUnexpectedlyError,
  TimeSeriesAggregationType,
  TimeSeriesBucketTimestamp,
  TimeSeriesDuplicatePolicies,
  TimeSeriesEncoding,
  TimeSeriesReducers,
  VectorAlgorithms,
  WatchError,
  defineScript,
} = redis

export {
  AbortError,
  AggregateGroupByReducers,
  AggregateSteps,
  ClientClosedError,
  ClientOfflineError,
  ConnectionTimeoutError,
  DisconnectsClientError,
  ErrorReply,
  GeoReplyWith,
  Graph,
  MultiErrorReply,
  ReconnectStrategyError,
  RedisFlushModes,
  RedisSearchLanguages,
  RootNodesUnavailableError,
  SchemaFieldTypes,
  SchemaTextFieldPhonetics,
  SocketClosedUnexpectedlyError,
  TimeSeriesAggregationType,
  TimeSeriesBucketTimestamp,
  TimeSeriesDuplicatePolicies,
  TimeSeriesEncoding,
  TimeSeriesReducers,
  VectorAlgorithms,
  WatchError,
  createClient,
  createCluster,
  defineScript,
  redis as default,
}

export type {
  RedisDefaultModules,
  RedisClientType,
  RedisClusterType,
} from 'redis'
