import { sql } from "drizzle-orm/sql";
import { db } from "@/db/database";

export async function resetDatabase() {
  try {
    console.log('Starting database reset...');

    // Drop all tables in public schema
    await db.execute(sql`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    console.log('All tables dropped successfully.');

    // Run your schema migrations here
    // This assumes you're using drizzle-kit for migrations
    console.log('Running schema migrations...');

    // You'll need to run drizzle-kit generate and push separately
    // The following commands should be run in the terminal:
    // bun drizzle-kit generate:pg
    // bun drizzle-kit push:pg

  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}

export async function setupDashboardUser(
  username: string,
  password: string,
  database: string
) {
  try {
    // Check if user exists
    const userExists = await db.execute(sql`
      SELECT 1 FROM pg_roles WHERE rolname = ${username}
    `);

    if (!userExists.rowCount) {
      // Create user and grant privileges
      await db.execute(sql`
        CREATE USER ${sql.raw(username)} WITH PASSWORD ${password};
        
        GRANT CONNECT ON DATABASE ${sql.raw(database)} TO ${sql.raw(username)};
        
        GRANT USAGE ON SCHEMA public TO ${sql.raw(username)};
        
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${sql.raw(username)};
        
        ALTER DEFAULT PRIVILEGES IN SCHEMA public 
        GRANT SELECT ON TABLES TO ${sql.raw(username)};
      `);

      console.log(`Successfully created user ${username} with read privileges`);
    } else {
      console.log(`User ${username} already exists`);
    }
  } catch (error) {
    console.error('Failed to setup dashboard user:', error);
    throw error;
  }
}