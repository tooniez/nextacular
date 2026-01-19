import { PrismaClient } from '@prisma/client';

let prisma;

// Reduce connection pool size to save memory
// Add connection_limit=2 and pool_timeout=10 to DATABASE_URL
function getDatabaseUrlWithPoolLimits() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) return dbUrl;
  
  // Remove existing connection_limit and pool_timeout if present
  let url = dbUrl.split('?')[0];
  const params = new URLSearchParams(dbUrl.split('?')[1] || '');
  
  // Set minimal connection pool (1 connection max, 5s timeout) to save memory
  params.set('connection_limit', '1');
  params.set('pool_timeout', '5');
  
  return `${url}?${params.toString()}`;
}

const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrlWithPoolLimits(),
    },
  },
};

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaOptions);
  }

  prisma = global.prisma;
}

export default prisma;
