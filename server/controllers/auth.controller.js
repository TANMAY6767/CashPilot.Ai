import prisma from "../prisma/client.js";
import bcrypt from "bcrypt";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from "../services/authToken.service.js";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse, statusType } from "../utils/index.js";

import { refreshCookieOptions } from "../config/auth.js";


const createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const cleanName = name?.trim();
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanName || !cleanEmail || !password) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Name, email and password are required."
    );
  }

  if (password.length < 8) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Password must be at least 8 characters long."
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: cleanEmail,
    },
  });

  if (existingUser) {
    throw new ApiError(
      statusType.CONFLICT,
      "User already exists."
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Never store raw refresh token
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_TTL_MS
      ),
    },
  });

  // Refresh token goes into HttpOnly cookie
  res.cookie(
    "refreshToken",
    refreshToken,
    refreshCookieOptions
  );

  return sendResponse(
    res,
    "success",
    {
      accessToken,
      user,
    },
    "User created successfully.",
    statusType.CREATED
  );
});


const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Email and password are required."
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: cleanEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Invalid email or password."
    );
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Invalid email or password."
    );
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const accessToken = generateAccessToken(safeUser);
  const refreshToken = generateRefreshToken(safeUser);

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(
        Date.now() + REFRESH_TOKEN_TTL_MS
      ),
    },
  });

  res.cookie(
    "refreshToken",
    refreshToken,
    refreshCookieOptions
  );

  return sendResponse(
    res,
    "success",
    {
      accessToken,
      user: safeUser,
    },
    "User logged in successfully.",
    statusType.OK
  );
});


const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Refresh token missing."
    );
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.clearCookie(
      "refreshToken",
      refreshCookieOptions
    );

    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Invalid or expired refresh token."
    );
  }

  if (
    typeof payload !== "object" ||
    payload.type !== "refresh" ||
    typeof payload.sub !== "string"
  ) {
    res.clearCookie(
      "refreshToken",
      refreshCookieOptions
    );

    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Invalid refresh token."
    );
  }

  const tokenHash = hashToken(refreshToken);

  const storedToken =
    await prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!storedToken) {
    res.clearCookie(
      "refreshToken",
      refreshCookieOptions
    );

    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Invalid refresh token."
    );
  }

  // Refresh-token reuse detection
  if (storedToken.revokedAt) {
    // Someone is trying to reuse an old refresh token.
    // Revoke all active sessions for this user.
    await prisma.refreshToken.updateMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    res.clearCookie(
      "refreshToken",
      refreshCookieOptions
    );

    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Refresh token reuse detected. Please log in again."
    );
  }

  if (storedToken.expiresAt <= new Date()) {
    await prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    res.clearCookie(
      "refreshToken",
      refreshCookieOptions
    );

    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Refresh token has expired."
    );
  }

  if (storedToken.userId !== payload.sub) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Invalid refresh token."
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.sub,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.clearCookie(
      "refreshToken",
      refreshCookieOptions
    );

    throw new ApiError(
      statusType.UNAUTHORIZED,
      "User no longer exists."
    );
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  const newRefreshTokenHash =
    hashToken(newRefreshToken);

  /*
   * IMPORTANT:
   *
   * Revoke old token and create new token
   * inside the same DB transaction.
   */
  await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Handles two simultaneous refresh requests.
    if (revoked.count !== 1) {
      throw new ApiError(
        statusType.UNAUTHORIZED,
        "Refresh token already used."
      );
    }

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_TTL_MS
        ),
      },
    });
  });

  // Replace old refresh cookie
  res.cookie(
    "refreshToken",
    newRefreshToken,
    refreshCookieOptions
  );

  return sendResponse(
    res,
    "success",
    {
      accessToken: newAccessToken,
    },
    "Access token refreshed successfully.",
    statusType.OK
  );
});


const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  res.clearCookie(
    "refreshToken",
    refreshCookieOptions
  );

  return sendResponse(
    res,
    "success",
    null,
    "Logged out successfully.",
    statusType.OK
  );
});

export {
    refreshAccessToken,
    createUser,
    loginUser,
    logoutUser,
};