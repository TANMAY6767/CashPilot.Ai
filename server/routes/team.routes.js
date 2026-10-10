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
} from "../controllers/team.controller.js";
import { checkAuth } from "../middleware/index.js";
import { auditMutation } from "../services/auditLog.service.js";

const router = Router();
router.use(checkAuth);

router.route("/org/:orgId/teams")
  .get(getAllTeams)
  .post(auditMutation, createTeam);

router.route("/org/:orgId/teams/:teamId")
  .get(getOneTeam)
  .patch(auditMutation, updateTeam)
  .delete(auditMutation, deleteTeam);

router.route("/teams/:teamId/members")
  .get(getTeamMembers)
  .post(auditMutation, addTeamMember);

router.route("/teams/:teamId/members/:memberUserId")
  .patch(auditMutation, updateTeamMemberRole)
  .delete(auditMutation, removeTeamMember);

router.post("/teams/:teamId/invitations", auditMutation, sendTeamInvitationEmail);
router.post("/invitations/:token/accept", acceptInvitation);

export default router;
