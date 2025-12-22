/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') }); // Try .env.local first
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });       // Then .env

async function migrate() {
  console.log('🚀 开始数据库迁移...');

  // 1. 获取数据库连接字符串
  const connectionString = 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL || 
    process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ 错误: 缺少数据库连接字符串。');
    console.error('请设置 POSTGRES_URL, DATABASE_URL, 或 SUPABASE_DB_URL 环境变量。');
    process.exit(1);
  }

  // 2. 连接数据库
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ 已连接到数据库。');

    // 3. 确保迁移记录表存在
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. 读取所有迁移文件
    // 我们使用 supabase/migrations_prod 目录来存放增量迁移文件
    // 以区分开发环境自动生成的 supabase/migrations 目录（那些通常是 supabase CLI 管理的）
    const migrationsDir = path.resolve(__dirname, '../supabase/migrations_prod');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ 错误: 迁移目录不存在: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // 确保按字母顺序执行 (001 -> 002 -> 003)

    if (files.length === 0) {
      console.log('⚠️ 没有找到 SQL 迁移文件。');
      await client.end();
      process.exit(0);
    }

    console.log(`📂 找到 ${files.length} 个迁移文件。`);

    // 5. 获取已执行的迁移
    const { rows: executedRows } = await client.query('SELECT name FROM _migrations');
    const executedNames = new Set(executedRows.map(row => row.name));

    // 6. 逐个执行未运行的迁移
    let executedCount = 0;
    
    for (const file of files) {
      if (!executedNames.has(file)) {
        console.log(`🔄 正在执行迁移: ${file}...`);
        
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
          // 开启事务
          await client.query('BEGIN');
          
          // 执行 SQL
          await client.query(sql);
          
          // 记录迁移状态
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          
          // 提交事务
          await client.query('COMMIT');
          
          console.log(`✅ ${file} 执行成功！`);
          executedCount++;
        } catch (err) {
          // 回滚事务
          await client.query('ROLLBACK');
          console.error(`❌ 执行 ${file} 失败。事务已回滚。`);
          throw err; // 抛出错误以中断后续迁移
        }
      } else {
        // console.log(`⏭️ 跳过已执行: ${file}`);
      }
    }

    if (executedCount > 0) {
      console.log(`🎉 成功执行了 ${executedCount} 个新迁移脚本！`);
    } else {
      console.log('✨ 数据库已是最新版本，无需更新。');
    }

    await client.end();
    process.exit(0);

  } catch (err) {
    console.error('❌ 迁移流程失败:', err);
    await client.end();
    process.exit(1);
  }
}

migrate();
