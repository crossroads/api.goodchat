# Goodchat API

[![forthebadge](https://forthebadge.com/images/badges/made-with-typescript.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](https://forthebadge.com)

[![codecov](https://codecov.io/gh/crossroads/api.goodchat/branch/main/graph/badge.svg?token=16160ETKGA)](https://codecov.io/gh/crossroads/api.goodchat)
[![CI Tests](https://github.com/crossroads/api.goodchat/actions/workflows/ci-tests.yml/badge.svg?branch=main)](https://github.com/crossroads/api.goodchat/actions/workflows/ci-tests.yml)

GoodChat API is a standalone [node.js](https://nodejs.org) web service allowing easy integration with [smooch.io](https://smooch.io)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [Design notes](#design-notes)
    - [Features](#features)
- [Documentation](#documentation)
- [Prerequisites](#prerequisites)
  - [System requirements](#system-requirements)
  - [Dependencies](#dependencies)
  - [Sunshine Conversations](#sunshine-conversations)
    - [Credentials](#credentials)
    - [Terminology](#terminology)
    - [Guides](#guides)
      - [Steps](#steps)
    - [Steps](#steps-1)
- [Running the server](#running-the-server)
  - [Manually](#manually)
  - [Using the ready-made CLI script](#using-the-ready-made-cli-script)
  - [Running in development mode (with autoreload)](#running-in-development-mode-with-autoreload)
  - [Running with docker](#running-with-docker)
    - [Building the docker image](#building-the-docker-image)
    - [Running the container](#running-the-container)
    - [Automatic db migrations](#automatic-db-migrations)
  - [Docker Registry](#docker-registry)
  - [Ngrok](#ngrok)
- [CLI Configuration](#cli-configuration)
  - [Environment variables](#environment-variables)
- [GraphQL](#graphql)
  - [Using the playground](#using-the-playground)
- [Testing](#testing)
- [Authentication Modes](#authentication-modes)
  - [Webhook](#webhook)
- [Database](#database)
  - [Migrations](#migrations)
  - [Diagram](#diagram)
    - [How to update the database diagram](#how-to-update-the-database-diagram)
- [Overall Architecture](#overall-architecture)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Design notes

The main purpose of Goodchat's is to integrate multiple chat channels to the [GoodCity Project](https://goodcity.hk), allowing people to donate goods directly via their existing channels.

That said, GoodChat was designed as a generic and reusable product and therefore holds _no_ shared business logic with the GoodCity. We intend this project, and therefore the code to be:

- Generic
- Reusable
- Configurable

#### Features

- [x] Integration with Sunshine Conversations
- [x] Webhooks support
- [x] GraphQL Server
- [x] GraphQL Subscriptions
- [x] Configurable authentication methods (allowing easy integration with existing systems)
- [ ] Configurable Push Notification support

<img src="./design/goodchat_integration.png" alt="drawing" width="700"/>

## Documentation

The code-generated documentation can be accessed [here](https://crossroads.github.io/api.goodchat/)

You can re-generate the documentation using the following npm script:

```bash
$> npm run document
```

Updating the README table of contents:

```bash
$> npm run doctoc
```

## Prerequisites

### System requirements

- Node 14.x
- NPM 7+

NPM 7 or above is required in order to handle peer-dependencies of the apollo server. An older version of NPM can be used but it may require you to install some modules manually

### Dependencies

Install the node dependencies using

```bash
$> npm install
```
### Sunshine Conversations

#### Credentials

Running GoodChat requires the following Sunshine Conversation credentials:

- An APP ID - Identifying which Sunshine app this is
- A Key ID - Acts as a username when authenticating to Sunshine
- A Key Secret - Acts as a password when authenticating to Sunshine

#### Terminology

- Smooch: The omnichat api used was previously known as Smooch, you may see that name in some places as it hasn't been fully renamed to "Sunshine Conversations" yet
- An integration: A chat service which connects to and integrates with Sunshine. e.g Whatsapp, Messenger, ...
- A custom integration: A chat service of our own which connects and integrates with Sunshine. GoodChat is a custom integration (it will auto-register itself)

#### Guides

<details>
	<summary>How to create a Sunshine Application</summary>

##### Steps
1. Login to your Sunshine Conversations account
2. Head to your dashboard (https://app.smooch.io)
3. On the right side click on the `Create new app` button
</details>

<details>
	<summary>How to create a Sunshine ID/Secret Key pair</summary>

#### Steps
1. Once your app is created, click on it from your dashboard view
2. On the app header bar, click on `Settings`
3. At the bottom of the settings page, you will find your api keys. Use the `Create new API key` action for a new one
4. Write down the ID/Secret key pair, as well as the APP ID
</details>

## Running the server

### Manually

You may create an instance of GoodChat, and start it manually as shown below

```typescript
import goodchat from '@goodcity/api.goodchat'

const [koa, apollo] = await goodchat()

koa.listen(8000, () => {
  console.info('Goodchat is running');
})
```

### Using the ready-made CLI script

An pre-written startup script exists under the `/bin` folder to run the server. It can be used easily thanks to the following npm scripts:

Build the project

```bash
$> npm run build
```

Run it

```bash
$> npm run start
```
### Running in development mode (with autoreload)

```bash
$> npm run dev
```

### Running with docker

#### Building the docker image

```bash
docker build . -t goodchat/goodchat
```

#### Running the container

```bash
docker run -p 8000:8000 -t \
  -e NODE_ENV=<env> \
  -e SMOOCH_APP_ID=<appId> \
  -e SMOOCH_API_KEY_ID=<apiKey> \
  -e SMOOCH_API_KEY_SECRET=<apiSecret> \
  -e DB_HOST=<dbHost> \
  -e DB_NAME=<dbName> \
  -e DB_CREDENTIALS=<dbUsername:dbPassword> \
  -e ENABLE_MIGRATIONS=<true|false> \
  -e REDIS_URL=<redisUrl> \
  goodchat/goodchat
```

e.g Running in development mode on a Mac with a local postgres and redis

```bash
docker run -p 8000:8000 --rm -t \
  -e NODE_ENV=development \
  -e SMOOCH_APP_ID=<appId> \
  -e SMOOCH_API_KEY_ID=<apiKey> \
  -e SMOOCH_API_KEY_SECRET=<apiSecret> \
  -e DB_HOST=host.docker.internal \
  -e ENABLE_MIGRATIONS=true \
  -e REDIS_URL="redis://host.docker.internal:6379" \
  goodchat/goodchat
```

#### Automatic db migrations

Setting the `ENABLE_MIGRATIONS` environment variable to `true`, will in turn cause the docker container to trigger a database migration on boot.

### Docker Registry

Github Actions will automatically push new builds to our registry according to the following rules:

* For the `main` branch
  * push a `latest` tag to the registry
  * push a `main` tag to the registry
* For the `live` branch
  * push a `live` tag to the registry
* For new tags
  * push a `v<tag>` tag to the registry

### Ngrok

When running the server in a development environment (NODE_ENV=development), the startup script will initiate an [ngrok](https://www.npmjs.com/package/ngrok) tunnel in order to have callable webhooks.

## CLI Configuration

### Environment variables

When running the server from an NPM script, the server can be configured using the following environment variables

| Variable                   | Default | Description   |
| -------------------------- | ------- | ------------- |
| NODE_ENV | `<required>` | The environment to run the server in |
| SMOOCH_APP_ID | `<required>` | Sunshine conversations app id (see [guide](#guides)) |
| SMOOCH_API_KEY_ID | `<required>` | Sunshine conversations api key (see [guide](#guides)) |
| SMOOCH_API_KEY_SECRET | `<required>` | Sunshine conversations api secret [guide](#guides) |
| GOODCHAT_HOST | `<required>` | The hostname of the server (can be omitted in [dev mode](#ngrok)) |
| GOODCHAT_AUTH_URL | `<required>` | The authentication server's endpoint |
| REDIS_URL  | `<required>` | Redis connection string |
| DB_NAME  | `<required>` | Postgres database name |
| DB_HOST  | `"localhost"` | Postgres host |
| DB_PORT  | `5432` | Postgres port |
| PORT     | 8000 | The server port |
| GOODCHAT_APP_NAME | `"GoodChat"` | The name of the app |

**NOTE**: Some of the _required_ fields are pre-populated for the development environments
## GraphQL

### Using the playground

- Open [](http://localhost:8000/graphql) on your browser to view the playground
- Make sure the Auth API is running, the default DEV environment will use localhost:3000 as an auth endpoint
- At the bottom of the playground, set the HTTP Headers to include an Authorization header
- Write your queries
- Press play

Here's an example query to get you started

```gql
query Conversations {
  conversations {
    id
    type
    messages {
      id
      content
    }
  }
}
```

## Testing

Goodchat specs are written using [Mocha](https://www.npmjs.com/package/mocha), they are all located under the `spec/` folder.

Run the specs using the following command:

```bash
$> npm run test
```

## Authentication Modes

### Webhook

<img src="./design/webhook_auth.png" alt="drawing" width="900"/>


## Database

### Migrations

Please refer to the [Pristma Migrate Flow](https://www.prisma.io/docs/concepts/components/prisma-migrate/prisma-migrate-flows)

A set of npm scripts are available for the common actions:

- `db:migrate:new` Creates a new migration (without applying it)
- `db:migrate:dev` Applies migrations to the dev environment
- `db:migrate:prod` Applies migrations on production (to be used in CD)

### Diagram

<img src="./design/dbdiagram.png" alt="drawing" width="900"/>

#### How to update the database diagram

Step 1: Update the `design/schema.dbml` file

```
npm run prisma:generate
```

Step 2: Copy the DBML to [dbdiagram](https://dbdiagram.io/d)

Step 3: Export into a PNG file and replace the `design/dbdiagram.png` file

## Overall Architecture

<img src="./design/architecture.png" alt="drawing" width="900"/>

## License

Copyright © 2020 by [Crossroads Foundation Ltd](https://www.crossroads.org.hk)

All rights reserved. No part of this software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of Crossroads Foundation Ltd. For permission requests, write to Crossroads Foundation Ltd., addressed “Attention: CTO” using the general contact details found on [www.crossroads.org.hk](https://www.crossroads.org.hk).
