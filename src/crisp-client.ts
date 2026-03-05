import { Crisp } from "crisp-api";
import * as dotenv from "dotenv";

dotenv.config();

const CrispClient = new Crisp();

const TIER = (process.env.CRISP_TIER || "plugin") as "user" | "plugin";
const IDENTIFIER = process.env.CRISP_IDENTIFIER;
const KEY = process.env.CRISP_KEY;
export const WEBSITE_ID = process.env.CRISP_WEBSITE_ID;

if (!IDENTIFIER || !KEY || !WEBSITE_ID) {
  throw new Error(
    "Missing required env vars: CRISP_IDENTIFIER, CRISP_KEY, CRISP_WEBSITE_ID"
  );
}

CrispClient.authenticateTier(TIER, IDENTIFIER, KEY);

export default CrispClient;
