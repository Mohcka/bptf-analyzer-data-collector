import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const db = drizzle(process.env.DATABASE_URL);

(async () => {
  try {
    // test query to force connection
    await db.execute(sql`SELECT 1`);
    console.log('Database connection successful.');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1); // Kill the program if connection fails
  }
})();
