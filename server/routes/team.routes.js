import { Router } from "express";

import {
  getAllTeams,
  getOneTeam,

  createTeam,
  updateTeam,
  deleteTeam,

  getTeamMembers,
  addTeamMember,

  sendTeamInvitationEmail,
  acceptInvitation,

  updateTeamMemberRole,
  removeTeamMember,

  createReimbursementClaim,
  approveReimbursementClaim,
  rejectReimbursementClaim

} from "../controllers/team.controller.js";

import { checkAuth } from "../middleware/index.js";

const router = Router();


// All team routes require authentication
router.use(checkAuth);


// =========================================================
// TEAMS
// =========================================================

// GET  /api/organizations/:orgId/teams
router.route("/:orgId/teams")
  .get(getAllTeams)
  .post(createTeam);
  


// GET    /api/teams/:teamId
// PATCH  /api/teams/:teamId
// DELETE /api/teams/:teamId

router.route("/:orgId/teams/:teamId")
  .get(getOneTeam)
  .patch(updateTeam)
  .delete(deleteTeam);


// =========================================================
// TEAM MEMBERS
// =========================================================

// GET /api/teams/:teamId/members
router.route("/teams/:teamId/members")
  .get(getTeamMembers)
  .post(addTeamMember);


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


router.post(
  "/:orgId/teams/:teamId/transactions",
  createReimbursementClaim
);

router.post(
  "/:orgId/teams/:teamId/reimbursement-claims",
  createReimbursementClaim
);

router.patch(
  "/organizations/:orgId/reimbursement-claims/:claimId/approve",
  approveReimbursementClaim
);

router.patch(
  "/organizations/:orgId/reimbursement-claims/:claimId/reject",
  rejectReimbursementClaim
);


export default router;
