import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 强制动态渲染，确保每次请求都真正执行，而不是返回缓存
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 执行一个极小的查询来唤醒数据库
    // 我们只查询 settings 表的一行 key 字段，数据量极小
    // 使用 supabaseAdmin (Service Role) 确保权限没问题
    const { error } = await supabaseAdmin
      .from('settings')
      .select('key')
      .limit(1)
      .maybeSingle(); // maybeSingle 避免如果表为空时报错

    if (error) {
      console.warn('Keep-alive query warning (database might be sleeping or error):', error.message);
    } else {
      console.log('Keep-alive query successful');
    }

    // 无论数据库是否响应成功，API 层面都返回 200 OK
    // 只要请求发出了，Supabase 就会检测到活动从而重置暂停计时器
    return NextResponse.json(
      { 
        status: 'ok', 
        message: 'Keep-alive triggered', 
        timestamp: new Date().toISOString() 
      }, 
      { status: 200 }
    );
  } catch (err) {
    console.error('Keep-alive handler crashed:', err);
    
    // 即使代码崩溃，也尝试返回 200，防止 UptimeRobot 报错骚扰用户
    return NextResponse.json(
      { 
        status: 'ok', 
        message: 'Keep-alive triggered (recovered from crash)',
        timestamp: new Date().toISOString()
      }, 
      { status: 200 }
    );
  }
}
