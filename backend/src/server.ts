import app from "./app";
import { env } from "./config/env";

const start = () => {
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`ChainShield API running on port ${env.port}`);
  });
};

start();

