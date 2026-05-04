[**HuskyTrack Frontend API Documentation v0.0.0**](../../../README.md)

***

[HuskyTrack Frontend API Documentation](../../../README.md) / [utils/tokenStorage](../README.md) / decodeToken

# Function: decodeToken()

> **decodeToken**(`token`): [`JWTPayload`](../interfaces/JWTPayload.md) \| `null`

Defined in: [utils/tokenStorage.ts:101](https://github.com/huskytrack/blob/dadd822176b15328aa65a203aa6c5f71fb0dc777/frontend/src/utils/tokenStorage.ts#L101)

Decode JWT token to get payload (without verification)
Useful for checking expiration

## Parameters

### token

`string`

## Returns

[`JWTPayload`](../interfaces/JWTPayload.md) \| `null`
