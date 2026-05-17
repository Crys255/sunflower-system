import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import type { QueryValues } from "mysql2";

declare global {
  // eslint-disable-next-line no-var
  var __sunflowerMysqlPool: Pool | undefined;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getDbPool() {
  if (!global.__sunflowerMysqlPool) {
    global.__sunflowerMysqlPool = mysql.createPool({
      host: requiredEnv("MYSQL_HOST"),
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: requiredEnv("MYSQL_USER"),
      password: requiredEnv("MYSQL_PASSWORD"),
      database: requiredEnv("MYSQL_DATABASE"),
      connectionLimit: 10,
      namedPlaceholders: false,
    });
  }

  return global.__sunflowerMysqlPool;
}

export async function dbQuery<T extends RowDataPacket[]>(
  sql: string,
  params: QueryValues = [],
) {
  const pool = getDbPool();
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function dbExecute(sql: string, params: QueryValues = []) {
  const pool = getDbPool();
  const [result] = await pool.query(sql, params);
  return result;
}
