# api.goodchat

## Running the server 

### In development mode

```bash
$> npm run dev
```

Running the server

```bash
$> npm run build
$> npm run start
```

### Manually

```bash
$> tsc
$> node dist/bin/serve.js
```

## Configuring the server

### Environment variables

* `NODE_ENV`  - defines the environment it's running on. Options:
	* `production` 
	* `staging`
        * `development` (default)
* `NO_AUTH` - if set to "true" or "yes", will no support any form of authentication (good for testing)

