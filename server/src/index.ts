import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { apiRouter } from "./routes/api.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/generated", express.static(path.resolve(import.meta.dirname, "../generated")));
app.use("/api", apiRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`foam-layout-pilot server listening on http://localhost:${PORT}`);
});
