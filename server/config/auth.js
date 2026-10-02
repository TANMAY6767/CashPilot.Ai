export const refreshCookieOptions = {
  httpOnly: true,

  secure: process.env.NODE_ENV === "production",

  sameSite: process.env.COOKIE_SAME_SITE || "lax",

  maxAge: 7 * 24 * 60 * 60 * 1000,

  // IMPORTANT:
  // Change this if your auth router is mounted somewhere else.
  path: process.env.AUTH_COOKIE_PATH || "/users",
};