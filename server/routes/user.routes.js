import { Router } from "express";
import { createUser,getAllUsers,loginUser,getMe,updateMe,deleteMe} from "../controllers/user.controller.js";
import { checkAuth } from "../middleware/index.js";

const router = Router(); 

router.post("/", createUser);
router.post("/login", loginUser);
router.get("/", getAllUsers);

router.use(checkAuth);

router.route("/me")
    .get(getMe)
    .patch(updateMe)
    .delete(deleteMe);

export default router;