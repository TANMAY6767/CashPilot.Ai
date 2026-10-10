import { Router } from "express";
import {
  getAllTransactions,
  getOrganizationActivity,
  getMyTransactions,
  getTransaction,
} from "../controllers/transaction.controller.js";
import { createTeamExpenseTransaction } from "../controllers/team.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router();
router.use(checkAuth);

router.get("/org/:orgId/transactions", getOrganizationActivity);
router.get("/org/:orgId/teams/:teamId/activity", getOrganizationActivity);

router.route("/org/:orgId/teams/:teamId/transactions")
  .get(getAllTransactions)
  .post(createTeamExpenseTransaction);

router.get("/org/:orgId/teams/:teamId/transactions/mine", getMyTransactions);
router.get("/org/:orgId/teams/:teamId/transactions/:transactionId", getTransaction);

export default router;
