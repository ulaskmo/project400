import { Request, Response, NextFunction } from "express";
import {
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  listFriends,
  listPendingRequests,
  sendMessage,
  getConversation,
  markConversationRead,
  getUnreadCount,
} from "../services/socialService";

function requireUser(req: Request, res: Response): string | null {
  if (!req.user) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return req.user.id;
}

// ---------- Friendships ----------

export const handleListFriends = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const friends = await listFriends(userId);
    res.json(friends);
  } catch (err) {
    next(err);
  }
};

export const handleListPending = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const requests = await listPendingRequests(userId);
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

export const handleSendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const result = await sendFriendRequest(userId, email);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const handleRespondRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    const { action } = req.body;

    if (action !== "accept" && action !== "decline") {
      res.status(400).json({ message: "Action must be 'accept' or 'decline'" });
      return;
    }

    await respondToFriendRequest(userId, id, action);
    res.json({ message: `Request ${action}ed` });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const handleRemoveFriend = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const { id } = req.params;
    await removeFriend(userId, id);
    res.json({ message: "Friend removed" });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// ---------- Messages ----------

export const handleGetConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const otherUserId = req.params.friendUserId;
    if (!otherUserId) {
      res.status(400).json({ message: "friendUserId param required" });
      return;
    }

    const messages = await getConversation(userId, otherUserId);
    await markConversationRead(userId, otherUserId);

    res.json(messages);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const handleSendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const { recipientId, content, credentialRef } = req.body;
    if (!recipientId || !content) {
      res.status(400).json({ message: "recipientId and content are required" });
      return;
    }

    const message = await sendMessage(userId, recipientId, content, credentialRef);
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const handleMarkRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const otherUserId = req.params.friendUserId;
    await markConversationRead(userId, otherUserId);
    res.json({ message: "Marked as read" });
  } catch (err) {
    next(err);
  }
};

export const handleGetUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const count = await getUnreadCount(userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
};
