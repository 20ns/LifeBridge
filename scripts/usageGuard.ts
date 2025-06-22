// @ts-nocheck
// Node built-ins such as 'process' are available at runtime via ts-node.
// No explicit import needed.
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";

/**
 * Simple cost guardrail script.
 *
 * Usage (before deploy):
 *   npx ts-node scripts/usageGuard.ts --threshold 5
 *
 * The script fetches the current month-to-date unblended cost from Cost Explorer,
 * projects the spend for the full month based on the proportion of days elapsed,
 * and exits with a non-zero status code if the projected total exceeds the threshold.
 *
 * It is intended to be wired into CI/CD pipelines to fail deployments that could
 * unintentionally increase AWS spend beyond the free-tier / hackathon limits.
 */

const DEFAULT_THRESHOLD = 5; // USD

interface CliArgs {
  threshold: number;
}

function getCliArgs(): CliArgs {
  const idx = process.argv.findIndex((arg) => arg === "--threshold");
  if (idx !== -1 && process.argv[idx + 1]) {
    const value = Number(process.argv[idx + 1]);
    if (!isNaN(value)) {
      return { threshold: value };
    }
  }
  return { threshold: DEFAULT_THRESHOLD };
}

async function getCurrentMonthCost(): Promise<number> {
  const client = new CostExplorerClient({});

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startStr = start.toISOString().split("T")[0]; // YYYY-MM-DD
  const endStr = now.toISOString().split("T")[0];

  const cmd = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: startStr,
      End: endStr,
    },
    Granularity: "MONTHLY",
    Metrics: ["UnblendedCost"],
  });

  const res = await client.send(cmd);
  const amountStr = res.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount;
  if (!amountStr) {
    throw new Error("Failed to retrieve cost data from Cost Explorer");
  }
  return parseFloat(amountStr);
}

async function main(): Promise<void> {
  const { threshold } = getCliArgs();
  try {
    const costSoFar = await getCurrentMonthCost();

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const daysPassed = Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();

    const projectedCost = (costSoFar / daysPassed) * totalDaysInMonth;

    console.log(`\nAWS Spend Guard\n----------------`);
    console.log(`Cost so far this month: $${costSoFar.toFixed(2)}`);
    console.log(`Projected end-of-month cost: $${projectedCost.toFixed(2)}`);
    console.log(`Threshold: $${threshold.toFixed(2)}\n`);

    if (projectedCost > threshold) {
      console.error(
        `ERROR: Projected spend ($${projectedCost.toFixed(
          2
        )}) exceeds threshold. Aborting deployment.`
      );
      process.exit(1);
    } else {
      console.log("Spend within threshold – proceeding with deployment.");
    }
  } catch (err) {
    console.error("Failed to evaluate cost guard:", err);
    // Abort on failure to avoid blind deployments
    process.exit(1);
  }
}

main(); 