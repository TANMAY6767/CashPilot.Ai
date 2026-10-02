import { Router } from "express";

import {
  createUser,
  loginUser,
  logoutUser,
  getAllUsers,
  getMe,
  updateMe,
  changePassword,
  getMyOrganizations,
  getMyTeams,
  deleteMe,
  refreshAccessToken
} from "../controllers/user.controller.js";

import { checkAuth } from "../middleware/index.js";

const router = Router();


// ============================================================
// PUBLIC ROUTES
// ============================================================

// Register
router.post("/", createUser);

// Login
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

router.use(checkAuth);


router
  .route("/me")
  .get(getMe)
  .patch(updateMe)
  .delete(deleteMe);

router.patch("/me/password", changePassword);

router.get("/me/organizations", getMyOrganizations);

router.get("/me/teams", getMyTeams);

router.get("/", getAllUsers);


export default router;