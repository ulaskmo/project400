import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  handleCancelRequest,
  handleCheckInterest,
  handleCreateRequest,
  handleExpressInterest,
  handleFlowFeed,
  handleGetRequest,
  handleInbox,
  handleListMyRequests,
  handleListRequestResponses,
  handleMatchRequest,
  handleMyResponses,
  handleSubmitResponse,
  handleVerifyResponse,
  handleWithdrawInterest,
} from "../controllers/presentationController";

const router = Router();

// Publicly readable: holders fetch a request by id after scanning the QR
router.get("/requests/:id", handleGetRequest);

// Authenticated routes
router.use(authenticate);

// Flow feed
router.get("/flow", handleFlowFeed);

// Interests
router.post("/requests/:id/interest", handleExpressInterest);
router.delete("/requests/:id/interest", handleWithdrawInterest);
router.get("/requests/:id/interest", handleCheckInterest);

// Verifier endpoints
router.post("/requests", handleCreateRequest);
router.get("/requests", handleListMyRequests);
router.post("/requests/:id/cancel", handleCancelRequest);
router.get("/requests/:id/responses", handleListRequestResponses);
router.get(
  "/requests/:id/responses/:responseId/verify",
  handleVerifyResponse
);

// Holder endpoints
router.get("/inbox", handleInbox);
router.get("/my-responses", handleMyResponses);
router.get("/requests/:id/match", handleMatchRequest);
router.post("/responses", handleSubmitResponse);

export default router;
