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

const router = Router();

router.use(checkAuth);

router.route("/:teamId/accounts")
  .get(getTeamAccounts)
  .post(createCustomAccount);

router.post("/:teamId/accounts/reimbursements", createReimbursementAccount);

router.route("/:teamId/accounts/:accountId")
  .get(getAccount)
  .patch(updateAccount)
  .delete(deleteAccount);

export default router;
