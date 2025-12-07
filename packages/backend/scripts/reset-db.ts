import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.NEONDB_API_KEY,
  ssl: { rejectUnauthorized: false }
});

async function resetDb() {
  const client = await pool.connect();
  try {
    console.log('Dropping tables...');
    await client.query('DROP TABLE IF EXISTS daily_summaries CASCADE');
    await client.query('DROP TABLE IF EXISTS commits CASCADE');
    await client.query('DROP TABLE IF EXISTS repos CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query('DROP TABLE IF EXISTS summaries CASCADE'); // Old table
    console.log('Tables dropped.');
  } catch (err) {
    console.error('Error dropping tables:', err);
  } finally {
    client.release();
    pool.end();
  }
}

resetDb();
