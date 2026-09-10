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
    const secret = process.env.JWT_SECRET || "default-secret";
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError("Akses ditolak: token tidak valid atau telah kedaluwarsa", 401));
  }
}
