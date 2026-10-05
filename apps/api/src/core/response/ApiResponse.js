class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    const payload = {
      success: true,
      message,
      data
    };
    if (meta) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, data = null, message = 'Created successfully', meta = null) {
    return ApiResponse.success(res, data, message, 201, meta);
  }

  static paginated(res, data, pagination, message = 'Retrieved successfully') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalItems: pagination.totalItems,
        totalPages: Math.ceil(pagination.totalItems / pagination.limit),
        hasNextPage: pagination.page * pagination.limit < pagination.totalItems,
        hasPrevPage: pagination.page > 1
      }
    });
  }

  static error(res, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', statusCode = 500, details = null) {
    const payload = {
      success: false,
      error: {
        code,
        message
      }
    };
    if (details) {
      payload.error.details = details;
    }
    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
