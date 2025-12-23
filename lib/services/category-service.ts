import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const categoryService = {
  /**
   * 获取分类列表（包含关联卡片数量）
   */
  async getCategories() {
    const categories = await db.categories.findMany({
      orderBy: { created_at: 'asc' },
      include: {
        _count: {
          select: { character_cards: true }
        }
      }
    });

    return categories.map(cat => ({
      ...cat,
      count: cat._count.character_cards
    }));
  },

  /**
   * 创建分类
   */
  async createCategory(data: { name: string; color?: string; description?: string }) {
    // 检查名称重复
    const existing = await db.categories.findFirst({
        where: { name: data.name }
    });
    
    if (existing) {
        throw new Error('Category already exists');
    }

    return await db.categories.create({
        data
    });
  },

  /**
   * 获取单个分类
   */
  async getCategory(id: string) {
      return await db.categories.findUnique({
          where: { id }
      });
  }
};
