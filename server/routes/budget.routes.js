import { Router } from "express";
import {
  createBudget,
  deleteBudget,
  getBudget,
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

export default router;
