import { JWT_SECRET } from "../config/auth";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

export interface AuthPayload {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Akses ditolak: token autentikasi tidak ditemukan", 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded === "string" || typeof decoded.id !== "string" || typeof decoded.email !== "string") {
      throw new Error("Payload token tidak valid");
    }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    return next(new AppError("Akses ditolak: token tidak valid atau telah kedaluwarsa", 401));
  }
}
