import { Metaplex } from "@metaplex-foundation/js";
import { Connection } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  logPath: "src/logs/logs",

}


const SOLANA_RPC_URL: string = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const SOLANA_WSS_URL: string = process.env.SOLANA_WSS_URL || "ws://api.mainnet-beta.solana.com";

export const connection = new Connection(SOLANA_RPC_URL, {  wsEndpoint: SOLANA_WSS_URL, });
export const metaplex = new Metaplex(connection);
