import { Request, Response, NextFunction } from "express";
import { verifyAccess, JwtPayload } from "../utils/jwt";
import { ApiError } from "../utils/apiError";

export interface AuthedRequest extends Request { user?: JwtPayload; }

export function authenticate(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Missing token");
  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}
