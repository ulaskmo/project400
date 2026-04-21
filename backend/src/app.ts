import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());

// CORS: allow specific origins instead of wildcard
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:4173"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  // Use the single shared predicate so /api/health and the credential /
  // DID services can never disagree on which mode the backend is in.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isBlockchainMode } = require("./config/env");
  res.json({
    status: "ok",
    mode: isBlockchainMode() ? "blockchain" : "demo",
  });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

