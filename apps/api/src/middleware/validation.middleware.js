const { ValidationError } = require('../core/errors/AppError');

/**
 * Validates request components (body, query, params) against validator rules
 * @param {Object} schemas - { body: fn, query: fn, params: fn }
 */
function validateRequest(schemas) {
  return (req, res, next) => {
    const errors = [];

    if (schemas.params && typeof schemas.params === 'function') {
      const result = schemas.params(req.params);
      if (result && result.error) {
        errors.push({ source: 'params', details: result.error });
      }
    }

    if (schemas.query && typeof schemas.query === 'function') {
      const result = schemas.query(req.query);
      if (result && result.error) {
        errors.push({ source: 'query', details: result.error });
      }
    }

    if (schemas.body && typeof schemas.body === 'function') {
      const result = schemas.body(req.body);
      if (result && result.error) {
        errors.push({ source: 'body', details: result.error });
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Request validation failed', errors));
    }

    next();
  };
}

module.exports = {
  validateRequest
};
