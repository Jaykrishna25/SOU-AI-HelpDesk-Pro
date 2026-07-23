import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, error: message });
}
