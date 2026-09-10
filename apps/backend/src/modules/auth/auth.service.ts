import { JWT_SECRET } from "../../config/auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { LoginRequestDTO } from "@tivask/shared";

export class AuthService {
  async login({ email, password }: LoginRequestDTO) {
    if (!email || !password) {
      throw new AppError("Email dan password wajib diisi", 400);
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new AppError("Email atau password tidak sesuai", 401);
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      throw new AppError("Email atau password tidak sesuai", 401);
    }

    // 8 hours expiry per TRD Section 9
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: "8h", algorithm: "HS256" }
    );

    return {
      token,
      user: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  async getProfile(userId: string) {
    const admin = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!admin) {
      throw new AppError("Pengguna tidak ditemukan", 404);
    }

    return admin;
  }
}

export const authService = new AuthService();
