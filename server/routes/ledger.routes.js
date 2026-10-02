import { Router } from "express";
import {
  getAccountBalance,
  getAccountLedger,
  getRecentLedgerEntries,
  getTransactionLedger,
} from "../controllers/ledger.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router();

router.use(checkAuth);

router.get("/:teamId/ledger", getRecentLedgerEntries);
router.get("/:teamId/accounts/:accountId/ledger", getAccountLedger);
router.get("/:teamId/accounts/:accountId/balance", getAccountBalance);
router.get("/:teamId/transactions/:transactionId/ledger", getTransactionLedger);

export default router;
