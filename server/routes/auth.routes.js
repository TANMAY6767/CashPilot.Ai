import { Router } from "express";

import {
  createUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getMe,
  updateMe,
  changePassword,
  getAllUsers,
  getMyOrganizations,
  getMyTeams,
  deleteMe,
} from "../controllers/user.controller.js";

import { checkAuth } from "../middleware/index.js";

const router = Router();

// Public
router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

// Protected
router.use(checkAuth);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.patch("/me/password", changePassword);
router.delete("/me", deleteMe);

router.get("/", getAllUsers);
router.get("/organizations", getMyOrganizations);
router.get("/teams", getMyTeams);

export default router;