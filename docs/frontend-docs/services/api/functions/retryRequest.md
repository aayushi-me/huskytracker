[**HuskyTrack Frontend API Documentation v0.0.0**](../../../README.md)

***

[HuskyTrack Frontend API Documentation](../../../README.md) / [services/api](../README.md) / retryRequest

# Function: retryRequest()

> **retryRequest**\<`T`\>(`fn`, `retries`, `delay`): `Promise`\<`T`\>

Defined in: [services/api.ts:205](https://github.com/huskytrack/blob/dadd822176b15328aa65a203aa6c5f71fb0dc777/frontend/src/services/api.ts#L205)

Retry logic for failed requests

## Type Parameters

### T

`T`

## Parameters

### fn

() => `Promise`\<`T`\>

Function to retry

### retries

`number` = `3`

Number of retries (default: 3)

### delay

`number` = `1000`

Delay between retries in ms (default: 1000)

## Returns

`Promise`\<`T`\>
