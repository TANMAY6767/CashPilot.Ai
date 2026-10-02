import crypto from "crypto";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export const REFRESH_TOKEN_TTL_MS =
  7 * 24 * 60 * 60 * 1000;

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: "access",
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh",
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET
  );
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    process.env.REFRESH_TOKEN_SECRET
  );
};

export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};