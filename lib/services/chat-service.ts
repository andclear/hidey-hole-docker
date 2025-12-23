import { db } from '@/lib/db';
import { getStorage } from '@/lib/storage';

export const chatService = {
  /**
   * 获取角色的聊天会话列表
   */
  async getSessions(cardId: string) {
    return await db.chat_sessions.findMany({
      where: { card_id: cardId },
      orderBy: { created_at: 'desc' }
    });
  },

  /**
   * 删除聊天会话
   */
  async deleteSession(cardId: string, sessionId: string) {
    // 1. 获取会话信息
    const session = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.card_id !== cardId) {
      throw new Error('Session not found or permission denied');
    }

    // 2. 删除文件 (如果存在)
    if (session.s3_key) {
        try {
            const storage = await getStorage();
            await storage.delete(session.s3_key);
        } catch (e) {
            console.error("Storage Delete Error:", e);
            // 继续删除数据库记录，不要因为文件删除失败而阻塞
        }
    }

    // 3. 删除数据库记录
    await db.chat_sessions.delete({
      where: { id: sessionId }
    });
  },
  
  /**
   * 更新会话信息 (如重命名)
   */
  async updateSession(cardId: string, sessionId: string, data: { file_name: string }) {
     const session = await db.chat_sessions.findUnique({ where: { id: sessionId }});
     if (!session || session.card_id !== cardId) throw new Error('Not found');

     await db.chat_sessions.update({
         where: { id: sessionId },
         data: { file_name: data.file_name }
     });
  },

  /**
   * 上传新的聊天记录
   */
  async uploadSession(cardId: string, file: File | Blob, fileName: string) {
      const card = await db.character_cards.findUnique({
          where: { id: cardId },
          select: { file_hash: true }
      });

      if (!card || !card.file_hash) {
          throw new Error('Card not found');
      }

      // 构造存储路径
      const hashPrefix = card.file_hash.substring(0, 8);
      const pathPrefix = 'chat_history';
      const storagePath = `${hashPrefix}/${pathPrefix}/${fileName}`;

      // 上传文件
      const storage = await getStorage();
      
      // 注意: File/Blob 在 Node 环境中可能需要转换
      let buffer: Buffer | Uint8Array;
      if (file instanceof Blob) {
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
      } else {
          // 假设是 Buffer
          buffer = file as any;
      }

      await storage.upload(storagePath, buffer, 'application/json');

      // 创建数据库记录
      const session = await db.chat_sessions.create({
          data: {
              card_id: cardId,
              file_name: fileName,
              s3_key: storagePath,
              file_size: buffer.length,
              message_count: 0, // TODO: 解析文件统计消息数?
          }
      });

      return session;
  }
};
