/**
 * Standard API Response format.
 */
const successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
};

const errorResponse = (res, errorMessage, statusCode = 500, errObj = null) => {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: errorMessage,
    stack: errObj ? errObj.stack : undefined
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
