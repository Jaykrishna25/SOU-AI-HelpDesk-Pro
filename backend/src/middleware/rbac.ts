import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AuthedRequest } from "./auth";
import { ApiError } from "../utils/apiError";

// Role-Based Access Control middleware
export const authorize = (...roles: Role[]) =>
  (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw new ApiError(401, "Unauthenticated");
    if (!roles.includes(req.user.role))
      throw new ApiError(403, `Requires role: ${roles.join(", ")}`);
    next();
  };
