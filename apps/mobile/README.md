# Mobile client

This is the Android/iOS foundation for the Abi Mizrak Digital Campus. It uses the same backend identity and API contract as the web client.

## Required environment

`EXPO_PUBLIC_API_URL` should point at the API origin, for example `http://localhost:5000` for a local development server.

## Build

Install dependencies from the repository root, then run `pnpm --filter @workspace/mobile start`.

The mobile app deliberately does not read/write school tables directly. Authentication tokens and secure local state should be stored using platform-secure storage as the authentication flow is expanded.
