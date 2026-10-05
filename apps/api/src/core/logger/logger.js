const pino = require('pino');
const pretty = require('pino-pretty');
const env = require('../../config/environment');

const SENSITIVE_FIELDS = [
  'password', 'passwordHash', 'token', 'refreshToken',
  'secret', 'apiKey', 'creditCard', 'cvv', 'authorization'
];

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const isDev = !env.IS_PRODUCTION && !env.IS_TEST;
const isSilent = env.IS_TEST && process.env.TEST_LOGS !== 'true';

const pinoOptions = {
  level: isSilent ? 'silent' : (env.LOG_LEVEL || 'info'),
  redact: {
    paths: [
      'password', 'passwordHash', 'token', 'refreshToken',
      'secret', 'apiKey', 'creditCard', 'cvv', 'authorization',
      '*.password', '*.passwordHash', '*.token', '*.refreshToken',
      '*.secret', '*.apiKey', '*.creditCard', '*.cvv', '*.authorization',
      'req.headers.authorization', 'req.headers.cookie'
    ],
    censor: '[REDACTED]'
  }
};

const destinationStream = isDev
  ? pretty({
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false
    })
  : undefined;

const rawPino = destinationStream ? pino(pinoOptions, destinationStream) : pino(pinoOptions);

// Wrapper to seamlessly support both (msg, meta) and (meta, msg) calls
function wrapLevel(levelName) {
  const origFn = rawPino[levelName].bind(rawPino);
  return function(first, second, ...rest) {
    if (typeof first === 'string' && second && typeof second === 'object') {
      return origFn(sanitizeObject(second), first, ...rest);
    }
    if (typeof first === 'object' && first !== null) {
      return origFn(sanitizeObject(first), second, ...rest);
    }
    return origFn(first, second, ...rest);
  };
}

const logger = {
  info: wrapLevel('info'),
  warn: wrapLevel('warn'),
  error: wrapLevel('error'),
  debug: wrapLevel('debug'),
  fatal: wrapLevel('fatal'),
  trace: wrapLevel('trace'),
  raw: rawPino
};

module.exports = {
  logger,
  rawPino,
  sanitizeObject
};
