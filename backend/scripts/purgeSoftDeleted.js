import { purgeSoftDeletedEntitiesService } from '../src/services/purge.js';
import { prisma } from '../prisma/client.js';

const main = async () => {
  try {
    const summary = await purgeSoftDeletedEntitiesService();

    console.info('[purge] Completed purge successfully');
    console.info('[purge] Summary:', summary);
  } catch (error) {
    console.error('[purge] Purge failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

main();
