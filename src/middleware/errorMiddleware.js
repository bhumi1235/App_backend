import { errorResponse } from "../utils/responseHandler.js";

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Check if it's a known operational error with stats or default to 500
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    return errorResponse(res, "Global Error: " + message, statusCode);
};

export default errorHandler;
