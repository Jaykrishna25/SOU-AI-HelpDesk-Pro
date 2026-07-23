import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface JwtPayload { sub: string; role: Role; loginId: string; }

export const signAccess = (p: JwtPayload) =>
  jwt.sign(p, env.jwtAccess, { expiresIn: env.accessTtl });
export const signRefresh = (p: JwtPayload) =>
  jwt.sign(p, env.jwtRefresh, { expiresIn: env.refreshTtl });
export const verifyAccess = (t: string) => jwt.verify(t, env.jwtAccess) as JwtPayload;
export const verifyRefresh = (t: string) => jwt.verify(t, env.jwtRefresh) as JwtPayload;
