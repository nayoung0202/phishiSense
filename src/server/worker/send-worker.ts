import "dotenv/config";
import process from "node:process";
import { startSendWorkerLoop } from "../services/sendJobRunner";

startSendWorkerLoop().catch((error) => {
  console.error("[send-worker] 시작 실패", error);
  process.exit(1);
});
