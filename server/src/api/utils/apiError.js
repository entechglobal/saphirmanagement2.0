//desc this class is responsible about operation errors(i can predict)

class ApiError extends Error {
  constructor(message, statusCode, translate) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith(4) ? "fail" : "error";
    this.isOperational = true;
    this.translate = translate ? translate : "";
  }
}
export default ApiError;
