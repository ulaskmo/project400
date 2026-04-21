import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  handleListFriends,
  handleListPending,
  handleSendRequest,
  handleRespondRequest,
  handleRemoveFriend,
  handleGetConversation,
  handleSendMessage,
  handleMarkRead,
  handleGetUnreadCount,
} from "../controllers/socialController";

const router = Router();

// All social routes require auth
router.use(authenticate);

// Friendships
router.get("/friends", handleListFriends);
router.get("/friends/pending", handleListPending);
router.post("/friends/request", handleSendRequest);
router.post("/friends/:id/respond", handleRespondRequest);
router.delete("/friends/:id", handleRemoveFriend);

// Messages
router.get("/messages/unread-count", handleGetUnreadCount);
router.get("/messages/:friendUserId", handleGetConversation);
router.post("/messages", handleSendMessage);
router.post("/messages/:friendUserId/read", handleMarkRead);

export default router;
