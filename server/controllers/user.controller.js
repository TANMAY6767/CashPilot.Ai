import prisma from "../prisma/client.js";
import bcrypt from "bcrypt";
import { getToken } from "../services/tokens.js";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse, statusType } from "../utils/index.js";


const getUserId = (req) => req.user?._id;

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

  if (password.length < 3) {
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

  const token = getToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendResponse(
    res,
    "success",
    user,
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

  const token = getToken(user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return sendResponse(
    res,
    "success",
    safeUser,
    "User logged in successfully.",
    statusType.OK
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return sendResponse(
    res,
    "success",
    null,
    "Logged out successfully.",
    statusType.OK
  );
});

const getMe = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized."
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
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
    throw new ApiError(
      statusType.NOT_FOUND,
      "User not found."
    );
  }

  return sendResponse(
    res,
    "success",
    user,
    "User fetched successfully.",
    statusType.OK
  );
});

const updateMe = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized."
    );
  }

  const { name, email } = req.body;

  const cleanName = name?.trim();
  const cleanEmail = email?.trim().toLowerCase();

  if (!cleanName && !cleanEmail) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Provide at least one field to update."
    );
  }

  if (cleanEmail) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        NOT: {
          id: userId,
        },
      },
    });

    if (existingUser) {
      throw new ApiError(
        statusType.CONFLICT,
        "Email is already in use."
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      ...(cleanName && {
        name: cleanName,
      }),

      ...(cleanEmail && {
        email: cleanEmail,
      }),
    },

    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return sendResponse(
    res,
    "success",
    updatedUser,
    "User updated successfully.",
    statusType.OK
  );
});

const changePassword = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized."
    );
  }

  const {
    currentPassword,
    newPassword,
  } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "Current password and new password are required."
    );
  }

  if (newPassword.length < 3) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "New password must be at least 8 characters long."
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(
      statusType.NOT_FOUND,
      "User not found."
    );
  }

  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Current password is incorrect."
    );
  }

  const isSamePassword = await bcrypt.compare(
    newPassword,
    user.passwordHash
  );

  if (isSamePassword) {
    throw new ApiError(
      statusType.BAD_REQUEST,
      "New password must be different from the current password."
    );
  }

  const newPasswordHash = await bcrypt.hash(
    newPassword,
    10
  );

  await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      passwordHash: newPasswordHash,
    },
  });

  return sendResponse(
    res,
    "success",
    null,
    "Password changed successfully.",
    statusType.OK
  );
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return sendResponse(
    res,
    "success",
    users,
    "Users fetched successfully.",
    statusType.OK
  );
});

const getMyOrganizations = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized."
    );
  }

  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
    },

    select: {
      id: true,
      role: true,
      joinedAt: true,

      organization: {
        select: {
          id: true,
          name: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },

    orderBy: {
      joinedAt: "desc",
    },
  });

  return sendResponse(
    res,
    "success",
    memberships,
    "Organizations fetched successfully.",
    statusType.OK
  );
});

const getMyTeams = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized."
    );
  }

  const memberships = await prisma.teamMember.findMany({
    where: {
      userId,
    },

    select: {
      id: true,
      role: true,
      joinedAt: true,

      team: {
        select: {
          id: true,
          name: true,
          organizationId: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,

          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },

    orderBy: {
      joinedAt: "desc",
    },
  });

  return sendResponse(
    res,
    "success",
    memberships,
    "Teams fetched successfully.",
    statusType.OK
  );
});

const deleteMe = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  if (!userId) {
    throw new ApiError(
      statusType.UNAUTHORIZED,
      "Unauthorized."
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
    },
  });

  if (!user) {
    throw new ApiError(
      statusType.NOT_FOUND,
      "User not found."
    );
  }

  /*
   * IMPORTANT:
   *
   * A user can be the creator/owner of organizations and teams.
   * Because those foreign keys are required, blindly deleting
   * the user can fail.
   *
   * Therefore, check ownership before deleting.
   */

  const ownedOrganizations = await prisma.organization.findMany({
    where: {
      createdById: userId,
    },

    select: {
      id: true,
      name: true,
    },
  });

  if (ownedOrganizations.length > 0) {
    throw new ApiError(
      statusType.CONFLICT,
      "You cannot delete your account while you own organizations. Transfer ownership or delete the organizations first."
    );
  }

  const ownedTeams = await prisma.team.findMany({
    where: {
      createdById: userId,
    },

    select: {
      id: true,
      name: true,
    },
  });

  if (ownedTeams.length > 0) {
    throw new ApiError(
      statusType.CONFLICT,
      "You cannot delete your account while you own teams. Transfer ownership or delete the teams first."
    );
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return sendResponse(
    res,
    "success",
    null,
    "Account deleted successfully.",
    statusType.OK
  );
});


export {
  createUser,
  loginUser,
  logoutUser,
  getMe,
  updateMe,
  changePassword,
  getAllUsers,
  getMyOrganizations,
  getMyTeams,
  deleteMe,
};