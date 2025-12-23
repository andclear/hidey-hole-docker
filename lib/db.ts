import { PrismaClient } from '@prisma/client';
import { PrismaPg } from 'pglite-prisma-adapter';
import { PGlite } from '@electric-sql/pglite';

// 防止开发环境下创建多个 Prisma 实例
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// 获取部署模式: 'cloud' (默认), 'docker', 'apk'
const DEPLOY_MODE = process.env.NEXT_PUBLIC_DEPLOY_MODE || 'cloud';

const createPrismaClient = () => {
  console.log(`[DB] 初始化数据库连接，模式: ${DEPLOY_MODE}`);

  if (DEPLOY_MODE === 'cloud') {
    // Cloud 模式: 直接连接 Supabase (PostgreSQL)
    // 需要在 .env 中配置 DATABASE_URL
    return new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
  } else if (DEPLOY_MODE === 'apk') {
    // APK 模式: 浏览器内运行 (WASM)
    // 使用 IndexedDB 持久化数据
    const client = new PGlite('idb://hidey-hole-db');
    const adapter = new PrismaPg(client);
    return new PrismaClient({ adapter });
  } else {
    // Docker 模式 (默认 fallback): 本地 Node.js 环境
    // 使用本地文件系统存储数据
    // 在 Docker 中，建议挂载 /app/data 目录
    const client = new PGlite('./data/pglite-db');
    const adapter = new PrismaPg(client);
    return new PrismaClient({ adapter });
  }
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
