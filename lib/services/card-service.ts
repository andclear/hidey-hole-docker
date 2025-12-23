import { db } from '@/lib/db';
import { calculateCardRating } from '@/lib/utils';
import { Prisma } from '@prisma/client';

export type CardSortOption = 'created_at' | 'updated_at' | 'name' | 'user_rating';
export type SortOrder = 'asc' | 'desc';

export interface GetCardsParams {
  page?: number;
  limit?: number;
  q?: string;
  sort?: CardSortOption;
  order?: SortOrder;
  categoryId?: string;
  tag?: string;
}

export const cardService = {
  /**
   * 获取角色卡列表
   */
  async getCards({ page = 1, limit = 20, q, sort = 'created_at', order = 'desc', categoryId, tag }: GetCardsParams) {
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const where: Prisma.character_cardsWhereInput = {
      is_deleted: false,
    };

    if (q) {
      const search = q.replace(/[(),]/g, '').trim();
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { ai_summary: { contains: search, mode: 'insensitive' } },
          { user_notes: { contains: search, mode: 'insensitive' } },
          { creator_notes: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    if (categoryId) {
        if (categoryId === 'null' || categoryId === 'uncategorized') {
            where.category_id = null;
        } else {
            where.category_id = categoryId;
        }
    }

    if (tag) {
        where.card_tags = {
            some: {
                tags: {
                    name: tag
                }
            }
        };
    }

    // 执行查询
    // Prisma 的 count 和 findMany 可以并行执行
    const [total, cards] = await Promise.all([
        db.character_cards.count({ where }),
        db.character_cards.findMany({
            where,
            orderBy: { [sort]: order },
            skip,
            take: limit,
            include: {
                categories: true,
                card_reviews: true,
                card_tags: {
                    include: {
                        tags: true
                    }
                }
            }
        })
    ]);

    // 转换数据格式 (Flatten)
    const flattenedData = cards.map(card => {
        const review = card.card_reviews; 
        const dynamicRating = review ? calculateCardRating(review as any) : null;
        
        return {
            ...card,
            user_rating: dynamicRating !== null ? dynamicRating : card.user_rating,
            tags: card.card_tags.map(ct => ct.tags).filter(Boolean),
            // 移除不需要的嵌套字段，保持 API 响应整洁
            card_reviews: undefined,
            card_tags: undefined,
        };
    });

    return {
        data: flattenedData,
        meta: {
            total,
            page,
            limit,
            hasMore: (skip + limit) < total
        }
    };
  },

  /**
   * 获取单个角色卡详情
   */
  async getCard(id: string) {
    const card = await db.character_cards.findUnique({
        where: { id },
        include: {
            categories: true,
            card_reviews: true,
            card_tags: {
                include: {
                    tags: true
                }
            }
        }
    });

    if (!card) return null;

    // 格式化数据
    const formattedData = {
        ...card,
        tags: card.card_tags.map(ct => ct.tags).filter(Boolean),
        card_tags: undefined
    };

    // [一致性检查] 确保 user_rating 与 card_reviews 匹配
    // 这原本在 API Route 中的逻辑，现在移到这里
    try {
        const review = card.card_reviews;
        if (review) {
            const calculatedRating = calculateCardRating(review as any);
            
            if (formattedData.user_rating !== calculatedRating) {
                console.log(`[Read-Repair] Fixing rating for ${id}: ${formattedData.user_rating} -> ${calculatedRating}`);
                
                await db.character_cards.update({
                    where: { id },
                    data: { user_rating: calculatedRating }
                });
                
                formattedData.user_rating = calculatedRating;
            }
        } else if (formattedData.user_rating !== null) {
             console.log(`[Read-Repair] Resetting rating for ${id}: ${formattedData.user_rating} -> null`);
             await db.character_cards.update({
                where: { id },
                data: { user_rating: null }
             });
             formattedData.user_rating = null;
        }
    } catch (syncError) {
        console.error("Failed to sync rating", syncError);
    }

    return formattedData;
  },

  /**
   * 更新角色卡
   */
  async updateCard(id: string, updates: Prisma.character_cardsUpdateInput, tags?: string[]) {
      // 1. 更新基础字段
      if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date(); // 自动更新 updated_at
          await db.character_cards.update({
              where: { id },
              data: updates
          });
      }

      // 2. 更新标签
      if (tags && Array.isArray(tags)) {
          if (tags.length > 30) {
              throw new Error('Tag limit exceeded (max 30)');
          }

          // 事务处理标签更新
          await db.$transaction(async (tx) => {
              // 删除旧标签关联
              await tx.card_tags.deleteMany({
                  where: { card_id: id }
              });

              // 插入新标签
              for (const tagName of tags) {
                  if (!tagName.trim()) continue;

                  // 查找或创建标签
                  // Prisma 没有直接的 upsert + return id for many 的简单方法，这里用 upsert
                  const tag = await tx.tags.upsert({
                      where: { name: tagName },
                      update: {},
                      create: { name: tagName }
                  });

                  // 创建关联
                  await tx.card_tags.create({
                      data: {
                          card_id: id,
                          tag_id: tag.id,
                          is_manual: true
                      }
                  });
              }
          });
      }
      return true;
  },

  /**
   * 软删除角色卡
   */
  async deleteCard(id: string) {
      await db.character_cards.update({
          where: { id },
          data: {
              is_deleted: true,
              deleted_at: new Date()
          }
      });
  }
};
