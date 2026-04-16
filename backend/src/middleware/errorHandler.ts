import { NextFunction, Request, Response } from "express";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = res.statusCode !== 200 ? res.statusCode : 500;

  // Log server errors for debugging
  if (status >= 500) {
    console.error(`[Error] ${status} - ${err.message}`, err.stack);
  }

  res.status(status).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && status >= 500 && { stack: err.stack }),
  });
};

