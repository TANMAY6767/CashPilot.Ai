import { Router } from "express";
import {
  createCustomAccount,
  createReimbursementAccount,
  deleteAccount,
  getAccount,
  getTeamAccounts,
  updateAccount,
} from "../controllers/account.controller.js";
import { checkAuth } from "../middleware/index.js";
import { auditMutation } from "../services/auditLog.service.js";

const router = Router();

router.use(checkAuth);

router.route("/:teamId/accounts")
  .get(getTeamAccounts)
  .post(auditMutation, createCustomAccount);

router.post("/:teamId/accounts/reimbursements", auditMutation, createReimbursementAccount);

router.route("/:teamId/accounts/:accountId")
  .get(getAccount)
  .patch(auditMutation, updateAccount)
  .delete(auditMutation, deleteAccount);

export default router;
