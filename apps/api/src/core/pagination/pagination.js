function getPaginationParams(req, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const requestedLimit = parseInt(req.query.limit || `${defaultLimit}`, 10);
  const limit = Math.min(maxLimit, Math.max(1, requestedLimit));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip
  };
}

module.exports = {
  getPaginationParams
};
