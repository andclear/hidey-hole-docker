import { db } from '@/lib/db';

export const tagService = {
  /**
   * 获取标签列表（包含使用次数）
   * 仅返回使用次数 > 0 的标签，并按使用次数降序排列
   */
  async getTags() {
    const tags = await db.tags.findMany({
      include: {
        _count: {
          select: { card_tags: true }
        }
      }
    });

    return tags
      .map(tag => ({
        name: tag.name,
        count: tag._count.card_tags
      }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }
};
