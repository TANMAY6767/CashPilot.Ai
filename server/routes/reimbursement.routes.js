import { Router } from "express";
import {
  createReimbursementClaim,
  getTeamReimbursementClaims,
  approveReimbursementClaim,
  rejectReimbursementClaim,
  payReimbursementClaim,
} from "../controllers/team.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router();
router.use(checkAuth);

router.route("/org/:orgId/teams/:teamId/reimbursement-claims")
  .get(getTeamReimbursementClaims)
  .post(createReimbursementClaim);

router.patch("/org/:orgId/reimbursement-claims/:claimId/approve", approveReimbursementClaim);
router.patch("/org/:orgId/reimbursement-claims/:claimId/reject", rejectReimbursementClaim);
router.patch("/org/:orgId/reimbursement-claims/:claimId/pay", payReimbursementClaim);

export default router;
