/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('🚀 开始一键部署...');

  // 0. 检查环境变量
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL || 
    process.env.SUPABASE_DB_URL;

  if (!connectionString) {
      console.error('❌ 错误: 缺少数据库连接字符串 (SUPABASE_DB_URL 或 POSTGRES_URL)');
      process.exit(1);
  }

  try {
    // 1. Prisma 负责表结构 (骨架)
    console.log('🏗️  1. 同步表结构 (Prisma)...');
    // 注意：--accept-data-loss 在生产环境需谨慎，但在开发阶段或初次部署非常有用
    // 它会强制让数据库结构与 schema.prisma 一致
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });

    // 2. SQL 负责 RLS 和 触发器 (灵魂)
    console.log('🛡️  2. 应用 RLS 和 触发器 (SQL)...');
    
    // 连接数据库 (使用 postgres.js)
    const sql = postgres(connectionString, { ssl: 'require', max: 1 });
    const secureSqlPath = path.join(__dirname, '../sql/secure.sql');

    if (fs.existsSync(secureSqlPath)) {
      const sqlContent = fs.readFileSync(secureSqlPath, 'utf8');
      
      // 因为我们要 AI 生成了“幂等”的 SQL (DO $$ ... END $$) 
      // 所以这里不需要复杂的拆分逻辑，直接整个文件执行即可 
      // 这里的 simple() 可以一次性执行多条语句
      await sql.simple(sqlContent);
      
      console.log('✅ 安全策略已应用');
    } else {
      console.log('ℹ️  未找到 secure.sql，跳过');
    }

    await sql.end();

    console.log('🎉 部署全部完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 部署失败:', error);
    process.exit(1);
  }
}

main();