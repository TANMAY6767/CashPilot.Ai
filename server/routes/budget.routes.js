import { Router } from "express";
import {
  createBudget,
  deleteBudget,
  getBudget,
  getRemainingBudget,
  updateBudget,
} from "../controllers/budget.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router();

router.use(checkAuth);

router.route("/:teamId/budget")
  .get(getBudget)
  .post(createBudget)
  .patch(updateBudget)
  .delete(deleteBudget);

router.get("/:teamId/budget/remaining", getRemainingBudget);

export default router;
