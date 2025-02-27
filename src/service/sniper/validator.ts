import { TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { connection } from "../../config/config";
import { ITokenLaunch } from "../../utils/types";
import {
  checkAutority,
  getTokenBurnPct,
} from "../../utils/utils";

export async function tokenValidator(param: ITokenLaunch): Promise<boolean> {
  const {
    mint,
    txHash,
    poolId,
    baseMint,
    quoteMint,
    wsolReserve,
    tokenReserve,
    lpReserve,
    lpDecimals,
    baseDecimals,
    created_timestamp,
  } = param;
  const [allAccounts, chkAuth, burnPct] = await Promise.all([
    connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 0, bytes: new PublicKey(mint).toBase58() } },
      ],
    }),
    checkAutority(mint),
    getTokenBurnPct(poolId), // burn percentage
  ]);
  const authority = chkAuth ? "Rug" : "Trust";
  const initLQAmt = wsolReserve; // SOL
  const chkTime = Date.now() - created_timestamp;
  const holders = allAccounts.length;
  const tableData = [
    {
      Mint: mint,
      Authority: authority,
      holders: holders,
      InitLQAmt: initLQAmt.toFixed(6),
      BurnPct: burnPct,
      chkTime: chkTime
    },
  ];
  console.table(tableData);
  // check if token is valid
  let isValid = true;
  return false;
}
