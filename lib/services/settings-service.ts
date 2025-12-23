import { db } from '@/lib/db';

export const settingsService = {
  /**
   * 获取所有设置
   */
  async getSettings() {
    const settings = await db.settings.findMany();
    const result: Record<string, any> = {};
    settings.forEach(item => {
      result[item.key] = item.value;
    });
    return result;
  },

  /**
   * 批量更新设置
   */
  async updateSettings(data: Record<string, any>) {
    const updates = Object.entries(data).map(([key, value]) => ({
      key,
      value: value, 
      updated_at: new Date()
    }));

    // 使用 Prisma 的 upsert 简化逻辑
    for (const update of updates) {
      await db.settings.upsert({
        where: { key: update.key },
        update: { value: update.value as any, updated_at: update.updated_at },
        create: { key: update.key, value: update.value as any, updated_at: update.updated_at }
      });
    }
  }
};
