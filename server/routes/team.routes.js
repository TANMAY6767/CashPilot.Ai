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

const router = Router();
router.use(checkAuth);

router.route("/org/:orgId/teams")
  .get(getAllTeams)
  .post(createTeam);

router.route("/org/:orgId/teams/:teamId")
  .get(getOneTeam)
  .patch(updateTeam)
  .delete(deleteTeam);

router.route("/teams/:teamId/members")
  .get(getTeamMembers)
  .post(addTeamMember);

router.route("/teams/:teamId/members/:memberUserId")
  .patch(updateTeamMemberRole)
  .delete(removeTeamMember);

router.post("/teams/:teamId/invitations", sendTeamInvitationEmail);
router.post("/invitations/:token/accept", acceptInvitation);

export default router;
