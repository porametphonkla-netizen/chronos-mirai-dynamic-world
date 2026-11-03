import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
