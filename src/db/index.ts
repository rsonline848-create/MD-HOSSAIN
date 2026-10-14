import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: pg.Pool | undefined;
}

// In-memory fallback store for development/preview when database is not connected
const inMemoryShops = new Map<string, any>();

function createMockDb() {
  const noOp = {
    findMany: async () => Array.from(inMemoryShops.values()),
    findFirst: async () => Array.from(inMemoryShops.values())[0] || null,
    findUnique: async () => null,
    create: async (d: any) => {
      if (d?.data?.id) inMemoryShops.set(d.data.id, d.data);
      return d?.data ?? {};
    },
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({})
  };

  const mockDbInstance: any = {
    query: new Proxy({}, { get: () => noOp }),
    select: () => ({
      from: (_table: any) => {
        const queryBuilder: any = {
          where: (_predicate?: any) => Promise.resolve(Array.from(inMemoryShops.values())),
          then: (resolve: any, reject?: any) => Promise.resolve(Array.from(inMemoryShops.values())).then(resolve, reject)
        };
        return queryBuilder;
      }
    }),
    insert: (_table: any) => ({
      values: (val: any) => {
        const item = { ...val, updatedAt: val.updatedAt || new Date() };
        inMemoryShops.set(item.id, item);
        const insertBuilder: any = {
          onConflictDoUpdate: (opts: any) => {
            const current = inMemoryShops.get(item.id) || {};
            const updated = { ...current, ...(opts?.set || {}), id: item.id };
            inMemoryShops.set(item.id, updated);
            return Promise.resolve([updated]);
          },
          then: (resolve: any, reject?: any) => Promise.resolve([item]).then(resolve, reject)
        };
        return insertBuilder;
      }
    })
  };

  return new Proxy(mockDbInstance, {
    get: (target, prop) => {
      if (prop in target) {
        return (target as any)[prop];
      }
      return async () => [];
    }
  });
}

// Function to create or retrieve the connection pool.
export const createPool = (): pg.Pool | null => {
  if (!process.env.SQL_HOST) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err: any) => {
      if (err.message && (err.message.includes('terminating connection due to administrator command') || err.message.includes('Connection terminated unexpectedly'))) {
        return; // Ignore normal Cloud SQL idle connection terminations
      }
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Initialize Drizzle with the pool and schema or graceful mock fallback
let dbInstance: any;
if (process.env.SQL_HOST) {
  try {
    const pool = createPool();
    if (pool) {
      dbInstance = drizzle(pool, { schema });
    } else {
      dbInstance = createMockDb();
    }
  } catch (e) {
    console.warn('[AI Studio] Database connection failed — using in-memory mock fallback');
    dbInstance = createMockDb();
  }
} else {
  dbInstance = createMockDb();
}

export const db = dbInstance;
