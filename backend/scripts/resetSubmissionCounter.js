import { prisma } from '../prisma/client.js';
import {
  resetMonthlySubmissionUsageService,
  resetSingleUserSubmissionUsageService,
} from '../src/services/submissionsReset.js';

const HELP_MESSAGE = `
Usage: node scripts/resetSubmissionCounter.js [options]

Options:
  --user-id <id>           Reset submissions for a single user
  --reference-date <date>  ISO date used as reference for period calculations (defaults to now)
  --triggered-by <value>   Label used in the reset summary (defaults to "cli")
  --help                   Show this message
`;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    triggeredBy: 'cli',
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    switch (arg) {
      case '--help': {
        options.help = true;
        break;
      }
      case '--user-id': {
        options.userId = args[i + 1];
        i += 1;
        break;
      }
      case '--reference-date': {
        options.referenceDate = args[i + 1];
        i += 1;
        break;
      }
      case '--triggered-by': {
        options.triggeredBy = args[i + 1] ?? options.triggeredBy;
        i += 1;
        break;
      }
      default: {
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}. Use --help to see available options.`);
        }
      }
    }
  }

  return options;
};

const buildReferenceDate = (value) => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid reference date: ${value}`);
  }

  return parsed;
};

const logSummary = (summary) => {
  console.info('[submissions:reset] Summary');
  console.info('  Total eligible users:', summary.total);
  console.info('  Users due for reset:', summary.due);
  console.info('  Attempted:', summary.attempted);
  console.info('  Processed:', summary.processed);
  console.info('  Skipped:', summary.skipped);
  console.info('  Failed:', summary.failed);

  if (summary.details?.length) {
    console.info('  Details:');
    summary.details.forEach((detail) => {
      console.info('   -', JSON.stringify(detail));
    });
  }
};

const main = async () => {
  let options;

  try {
    options = parseArgs();
  } catch (error) {
    console.error('[submissions:reset] ' + error.message);
    console.info(HELP_MESSAGE);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  if (options.help) {
    console.info(HELP_MESSAGE);
    await prisma.$disconnect();
    return;
  }

  try {
    const referenceDate = buildReferenceDate(options.referenceDate);

    const payload = {
      referenceDate,
      triggeredBy: options.triggeredBy,
    };

    const summary = options.userId
      ? await resetSingleUserSubmissionUsageService(options.userId, payload)
      : await resetMonthlySubmissionUsageService(payload);

    logSummary(summary);
    console.info('[submissions:reset] Completed successfully');
  } catch (error) {
    console.error('[submissions:reset] Failed to reset submissions');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

main();