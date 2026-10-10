import { Router } from "express";
import {
  createReimbursementClaim,
  getTeamReimbursementClaims,
  approveReimbursementClaim,
  rejectReimbursementClaim,
  payReimbursementClaim,
} from "../controllers/team.controller.js";
import { checkAuth } from "../middleware/index.js";
import { auditMutation } from "../services/auditLog.service.js";

const router = Router();
router.use(checkAuth);

router.route("/org/:orgId/teams/:teamId/reimbursement-claims")
  .get(getTeamReimbursementClaims)
  .post(auditMutation, createReimbursementClaim);

router.patch("/org/:orgId/reimbursement-claims/:claimId/approve", auditMutation, approveReimbursementClaim);
router.patch("/org/:orgId/reimbursement-claims/:claimId/reject", auditMutation, rejectReimbursementClaim);
router.patch("/org/:orgId/reimbursement-claims/:claimId/pay", auditMutation, payReimbursementClaim);

export default router;
