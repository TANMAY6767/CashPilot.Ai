import { Router } from "express";

import {
  getAllTeams,
  getOneTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  sendTeamInvitationEmail,
  acceptInvitation,
  updateTeamMemberRole,
  removeTeamMember,
} from "../controllers/teams.controller.js";

import { checkAuth } from "../middleware/index.js";

const router = Router();


// All team routes require authentication
router.use(checkAuth);


// =========================================================
// TEAMS
// =========================================================

// GET  /api/organizations/:orgId/teams
router.route("/organizations/:orgId/teams")
  .get(getAllTeams)
  .post(createTeam);


// GET    /api/teams/:teamId
// PATCH  /api/teams/:teamId
// DELETE /api/teams/:teamId

router.route("/teams/:teamId")
  .get(getOneTeam)
  .patch(updateTeam)
  .delete(deleteTeam);


// =========================================================
// TEAM MEMBERS
// =========================================================

// GET /api/teams/:teamId/members
router.route("/teams/:teamId/members")
  .get(getTeamMembers);


// PATCH  /api/teams/:teamId/members/:memberUserId
// DELETE /api/teams/:teamId/members/:memberUserId

router.route("/teams/:teamId/members/:memberUserId")
  .patch(updateTeamMemberRole)
  .delete(removeTeamMember);


// =========================================================
// INVITATIONS
// =========================================================

// POST /api/teams/:teamId/invitations
router.route("/teams/:teamId/invitations")
  .post(sendTeamInvitationEmail);


// POST /api/invitations/:token/accept
router.route("/invitations/:token/accept")
  .post(acceptInvitation);


export default router;