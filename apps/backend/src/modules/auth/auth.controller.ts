import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      // Set HTTP-only cookie per TRD Section 9
      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      });

      return res.status(200).json({
        message: "Login berhasil",
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie("token");
      return res.status(200).json({ message: "Logout berhasil" });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Tidak terautentikasi" });
      }
      const user = await authService.getProfile(req.user.id);
      return res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
