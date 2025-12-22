/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') }); // Try .env.local first
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });       // Then .env

async function migrate() {
  console.log('🚀 开始数据库迁移...');

  // 1. Get DB Connection String
  // Vercel / Supabase integration usually provides POSTGRES_URL or DATABASE_URL
  // We prefer POSTGRES_URL, then DATABASE_URL, then construct manually from SUPABASE_DB_URL if user sets it manually
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL || 
    process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ 错误: 缺少数据库连接字符串。');
    console.error('请设置 POSTGRES_URL, DATABASE_URL, 或 SUPABASE_DB_URL 环境变量。');
    process.exit(1);
  }

  // 2. Read Schema File
  const schemaPath = path.resolve(__dirname, '../supabase/migrations/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ 错误: 未找到 Schema 文件: ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  // 3. Connect to Database
  // Use "ssl: { rejectUnauthorized: false }" for Supabase/Vercel mostly to avoid self-signed cert errors in some pools
  // But strictly standard is true. Vercel Postgres usually requires SSL.
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ 已连接到数据库。');

    // 4. Execute SQL
    // Splitting by simple logic might be fragile if SQL contains semicolons in strings.
    // However, the `pg` client usually handles multiple statements in one query string perfectly fine.
    // So we just send the whole file content.
    
    console.log('📦 正在应用数据库 Schema...');
    await client.query(sql);
    
    console.log('✅ 数据库迁移成功完成！');
    await client.end();
    process.exit(0);

  } catch (err) {
    console.error('❌ 迁移失败:', err);
    await client.end();
    process.exit(1);
  }
}

migrate();
