// import _            from 'lodash'
// import createLogger from "./lib/utils/logger"

// const logger = createLogger('config');

// export interface AppConfig {
//   SMOOCH_APP_ID:          string
//   SMOOCH_API_KEY_ID:      string
//   SMOOCH_API_KEY_SECRET:  string
//   GOODCHAT_HOST:          string
//   ENV:                    string
// }

// // ------------------------------
// // Helpers
// // ------------------------------

// const casualRead = (key : string, defaultVal? : string) : string => {
//   return process.env[key] || defaultVal || "";
// }

// const strictRead = (key : string) : string => {
//   const val = casualRead(key);

//   if (val) return val;

//   logger.error(`Missing environment variable '${key}'`);
//   logger.error(`Exiting`);
//   process.exit(1);
// } 

// // ------------------------------
// // Base Config
// // ------------------------------

// const ENV_NAME = casualRead('NODE_ENV', 'development').toLowerCase();

// const DEFAULT : AppConfig  = {
//   SMOOCH_APP_ID:          strictRead('SMOOCH_APP_ID'),
//   SMOOCH_API_KEY_ID:      strictRead('SMOOCH_API_KEY_ID'),
//   SMOOCH_API_KEY_SECRET:  strictRead('SMOOCH_API_KEY_SECRET'),
//   GOODCHAT_HOST:          strictRead('GOODCHAT_HOST'),
//   ENV:                    ENV_NAME
// }

// // ------------------------------
// // Per-env overrides
// // ------------------------------

// const OVERRIDES = {
//   development: {

//   },
//   staging: {

//   },
//   production: {

//   }
// };

// // ------------------------------
// // Config resolution
// // ------------------------------

// const override = _.get(OVERRIDES, ENV_NAME);

// if (!override) {
//   logger.error(`Invalid environment ${ENV_NAME}`);
//   process.exit(1);
// }

// logger.info(`${ENV_NAME} environment detected`);

// export default {
//   ...DEFAULT,
//   ...override,
//   ENV: ENV_NAME
// } as AppConfig