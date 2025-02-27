import { ParsedAccountData, PublicKey } from "@solana/web3.js";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import * as spl from "@solana/spl-token";
import { IDexScreenerResponse } from "./types";
import { connection } from "../config/config";
import logger from "../logs/logger";

export const checkAutority = async (mint: string): Promise<boolean> => {
  try {
    // true => rug
    // false => trustable
    const mintAddress = new PublicKey(mint);
    const metadata = await spl.getMint(connection, mintAddress);
    let is_rug = false;
    if (!metadata) is_rug = true;
    if (metadata.mintAuthority) is_rug = true;
    if (metadata.freezeAuthority) is_rug = true;
    return is_rug;
  } catch (error: any) {
    logger.error("checkRugToken error" + error.message);
    return true;
  }
};

export const getDexscreenerData = async (
  mint: string
): Promise<IDexScreenerResponse | null> => {
  try {
    const url = `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

export const getTokenBurnPct = async (poolAddress: string): Promise<number> => {
  try {
    const acc = await connection.getMultipleAccountsInfo([
      new PublicKey(poolAddress),
    ]);
    const parsed = acc.map((v) =>
      v ? LIQUIDITY_STATE_LAYOUT_V4.decode(v.data) : null
    );
    const lpMint = parsed[0]?.lpMint;
    let lpReserve = parsed[0]?.lpReserve.toNumber() ?? 0; // Provide a default value of 0 if lpReserve is undefined
    if (lpMint) {
      const accInfo = await connection.getParsedAccountInfo(lpMint);
      const mintInfo = (accInfo?.value?.data as ParsedAccountData)?.parsed
        ?.info; // Add type assertion
      lpReserve = lpReserve / Math.pow(10, mintInfo?.decimals);
      const actualSupply = mintInfo?.supply / Math.pow(10, mintInfo?.decimals);
      const burnAmt = lpReserve - actualSupply;
      const burnPct = (burnAmt / lpReserve) * 100;
      return burnPct;
    }

    return 0;
  } catch (error) {
    logger.error(`Error in getLPburntPercent: ${error}`);
    return 0;
  }
};
