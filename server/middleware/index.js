import {
  verifyAccessToken,
} from "../services/authToken.service.js";

import { ApiError } from "../utils/ApiError.js";
import { statusType } from "../utils/index.js";

export const checkAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return next(
      new ApiError(
        statusType.UNAUTHORIZED,
        "Access token required."
      )
    );
  }

  const accessToken = authHeader.split(" ")[1];

  if (!accessToken) {
    return next(
      new ApiError(
        statusType.UNAUTHORIZED,
        "Access token required."
      )
    );
  }

  try {
    const payload = verifyAccessToken(accessToken);

    if (
      typeof payload !== "object" ||
      payload.type !== "access" ||
      typeof payload.sub !== "string"
    ) {
      throw new Error("Invalid access token");
    }

    req.user = {
      sub: payload.sub,
      email: payload.email,
    };

    next();
  } catch {
    return next(
      new ApiError(
        statusType.UNAUTHORIZED,
        "Invalid or expired access token."
      )
    );
  }
};