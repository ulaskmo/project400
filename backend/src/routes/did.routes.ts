import { Router } from "express";
import { handleCreateDid, handleListDids } from "../controllers/didController";

const router = Router();

router.post("/", handleCreateDid);
router.get("/", handleListDids);

export default router;

