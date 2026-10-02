import { Router } from "express";
import {
  createTransaction,
  getAllTransactions,
  getMyTransactions,
  getTransaction,
} from "../controllers/transaction.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router();

router.use(checkAuth);

router.route("/:teamId/transactions")
  .get(getAllTransactions)
  .post(createTransaction);

router.get("/:teamId/transactions/mine", getMyTransactions);
router.get("/:teamId/transactions/:transactionId", getTransaction);

export default router;
