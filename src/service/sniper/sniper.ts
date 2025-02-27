import { Commitment, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import chalk from "chalk";
import logger from "../../logs/logger";
import { tokenValidator } from "./validator";
import { WSOL } from "../../utils/constants";
import { ITokenLaunch } from "../../utils/types";
import { connection } from "../../config/config";

//----------------------- Raydium API -----------------------//
export const RAYDIUM_KEY = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM_PUBLIC_KEY = new PublicKey(RAYDIUM_KEY);
const COMMITMENT_LEVEL = "confirmed" as Commitment;
const CREATE_INSTRUCTION = "initialize2";

//----------------------- Sniper Service -----------------------//
export async function sniperService() {
  logger.info(chalk.green("Sniping started..."))
  try {
    connection.onLogs(
      RAYDIUM_PUBLIC_KEY,
      async ({ logs, err, signature }) => {
        try {
          if (err) return;

          if (logs && logs.some((log) => log.includes(CREATE_INSTRUCTION))) {
            const txn = await connection.getParsedTransaction(signature, {
              maxSupportedTransactionVersion: 0,
              commitment: "confirmed",
            });

            if (
              txn &&
              txn.meta &&
              txn.meta.preTokenBalances &&
              txn.meta.postTokenBalances
            ) {
              //@ts-ignore
              const accounts = (txn?.transaction.message.instructions).find((ix) => ix.programId.toBase58() === RAYDIUM_KEY).accounts as PublicKey[];
              if (!accounts) {
                console.log("No accounts found in the transaction.");
                return;
              }
              // 8: token, 9: wsol
              // const mint = accounts[8]; // this is new launched token
              const mint =
                accounts[8].toBase58() === WSOL ? accounts[9] : accounts[8]; // this is new launched token
              if (
                accounts[8].toBase58() !== WSOL &&
                accounts[9].toBase58() !== WSOL
              ) {
                return;
              }
              const poolId = accounts[4]; // this is pool id
              const signer = txn.transaction.message.accountKeys
                .find(
                  (key: any) =>
                    key.signer && key.writable && key.source === "transaction"
                )
                ?.pubkey.toBase58();
              const preTokenBal =
                txn.meta.preTokenBalances.find(
                  (tb) =>
                    tb.mint === mint.toBase58() &&
                    tb.owner === signer
                );
              const preLPTokenBal =
                txn.meta.preTokenBalances.find(
                  (tb) =>
                    tb.mint !== mint.toBase58() &&
                    tb.owner === signer
                );
              const postTokenBal =
                txn.meta.postTokenBalances.find(
                  (tb) =>
                    tb.mint === mint.toBase58() &&
                    tb.owner === signer
                );
              const postLPTokenBal =
                txn.meta.postTokenBalances.find(
                  (tb) =>
                    tb.mint !== mint.toBase58() &&
                    tb.owner === signer
                );
              const pre_sol = txn.meta.preBalances;
              const post_sol = txn.meta.postBalances;
              const fee = 0.2;
              const wsolReserve = Math.abs(
                (pre_sol[0] - post_sol[0]) / LAMPORTS_PER_SOL -
                  fee
              );
              const tokenReserve =
                (preTokenBal?.uiTokenAmount.uiAmount ?? 0) -
                (postTokenBal?.uiTokenAmount.uiAmount ?? 0);
              const lpReserve =
                (postLPTokenBal?.uiTokenAmount.uiAmount ?? 0) -
                (preLPTokenBal?.uiTokenAmount.uiAmount ?? 0);
              const baseDecimals =
                preTokenBal?.uiTokenAmount.decimals ?? 0;
              const lpDecimals =
                postLPTokenBal?.uiTokenAmount.decimals ?? 0;
              // const [totalSupply, targetPoolInfo] =
              //   await Promise.all([
              //     getMint(connection, mint).then(
              //       (mintInfo) =>
              //         Number(mintInfo.supply) /
              //         10 ** mintInfo.decimals
              //     ),
              //     formatAmmKeysByAccounts(
              //       accounts,
              //       baseDecimals
              //     ),
              //   ]);

              // const totalSupply = Number((await getMint(connection, mint)).supply);
              // const targetPoolInfo = await formatAmmKeysByAccounts(accounts, baseDecimals);
              const param: ITokenLaunch = {
                mint: mint.toBase58(),
                txHash: signature,
                poolId: poolId.toBase58(),
                baseMint: accounts[8].toBase58(),
                quoteMint: accounts[9].toBase58(),
                wsolReserve,
                tokenReserve,
                lpReserve,
                lpDecimals,
                baseDecimals,
                created_timestamp: Date.now(),
              };
              
              console.log(chalk.blue(
                `[ sniper ] 🎯 New Token found & monitor start: ${mint}`
              ));
              tokenValidator(param);
            }
          }
        } catch (e: any) {
          logger.error("[ * ] onLogs error: " + e.message + " " + signature);
        }
      },
      COMMITMENT_LEVEL
    );
  } catch (e: any) {
    logger.error("[ sniperService ] " + e.message);
  }
}
