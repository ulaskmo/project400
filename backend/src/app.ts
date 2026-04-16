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
  const isDemo = !process.env.WEB3_PROVIDER_URL || !process.env.DID_REGISTRY_ADDRESS || !process.env.ISSUER_PRIVATE_KEY;
  res.json({ status: "ok", mode: isDemo ? "demo" : "blockchain" });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

