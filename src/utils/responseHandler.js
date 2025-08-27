class ResponseHandler {
    success(res, data = null, message = 'Success', statusCode = 200) {
      return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
      });
    }
  
    error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
      return res.status(statusCode).json({
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
      });
    }
  
    validationError(res, errors) {
      return this.error(res, 'Validation Error', 400, errors);
    }
  
    notFound(res, message = 'Resource not found') {
      return this.error(res, message, 404);
    }
  
    unauthorized(res, message = 'Unauthorized') {
      return this.error(res, message, 401);
    }
  
    forbidden(res, message = 'Forbidden') {
      return this.error(res, message, 403);
    }
  }
  
  module.exports = new ResponseHandler();