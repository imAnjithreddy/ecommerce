const pinoHttp = require('pino-http');
const { rawPino } = require('./logger');
const env = require('../../config/environment');

const httpLogger = pinoHttp({
  logger: rawPino,
  autoLogging: {
    ignore: (req) => env.IS_TEST || req.url === '/health'
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res, responseTime) => {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${Math.round(responseTime)}ms)`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.originalUrl || req.url} failed with ${res.statusCode}: ${err.message}`;
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
          host: req.headers.host,
          'x-tenant-slug': req.headers['x-tenant-slug'],
          'user-agent': req.headers['user-agent']
        }
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  }
});

module.exports = {
  httpLogger
};
