import { Router } from "express";
import { createTeam,getOneTeam,updateTeam,deleteTeam} from "../controllers/team.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router(); 





router.use(checkAuth);

router.post("/", createTeam);
router.get("/getOne", getOneTeam);
router.patch("/",updateTeam)
router.delete("/",deleteTeam);

export default router;