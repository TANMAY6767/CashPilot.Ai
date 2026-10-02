import { Router } from "express";
import {
  getEntityAuditLogs,
  getMyAuditLogs,
} from "../controllers/auditLogs.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router();

router.use(checkAuth);

router.get("/me", getMyAuditLogs);
router.get("/:entityType/:entityId", getEntityAuditLogs);

export default router;
