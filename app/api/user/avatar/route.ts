
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('avatar_url')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        throw error;
    }
    
    const avatarUrl = data?.avatar_url || "";
    
    // 如果是 Data URI (Base64)，我们无法像 S3 图片那样直接做流式代理缓存
    // 但是我们可以解析 Base64 并返回二进制流，从而利用 Vercel 缓存
    
    if (avatarUrl.startsWith('data:image')) {
        // 解析 Base64
        const matches = avatarUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
            const contentType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable', // 永久缓存
                }
            });
        }
    }

    // 如果是普通 URL (http/https)，或者是空字符串，则返回 JSON (前端负责渲染)
    // 或者我们也可以 fetch 那个 URL 并代理它?
    // 目前看代码逻辑，avatar_url 主要是 Data URI。
    // 如果前端是 <img src="/api/user/avatar" /> 那么上面的二进制流返回是完美的。
    // 但如果前端是 fetch("/api/user/avatar") expect JSON，那就会炸。
    
    // 让我们检查一下前端是如何使用这个接口的。
    // 如果前端是 <AvatarImage src={avatarUrl} />，那通常 avatarUrl 是一个具体的图片地址。
    // 现在的 GET 接口返回的是 JSON: { success: true, avatar_url: "data:..." }
    
    // 用户希望 "缓存到 Vercel 的边缘节点"。
    // 这意味着我们需要一个新的接口（或者改造这个接口）来直接提供图片二进制流，而不是 JSON。
    
    return NextResponse.json({ success: true, avatar_url: avatarUrl });
  } catch (error) {
    console.error("Fetch Avatar Error:", error);
    return NextResponse.json({ error: "Failed to fetch avatar" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const { avatar_url } = await request.json();
        
        // Check if user_settings exists (assuming single user for now)
        // We might need a fixed ID or just use the first row
        // Let's assume we use a fixed ID 'default' or just upsert the first row
        
        // Actually, let's check if table has rows. If not, insert. If yes, update.
        const { data: existing } = await supabaseAdmin.from('user_settings').select('id').limit(1).single();
        
        let error;
        if (existing) {
            const res = await supabaseAdmin.from('user_settings').update({ avatar_url }).eq('id', existing.id);
            error = res.error;
        } else {
            const res = await supabaseAdmin.from('user_settings').insert({ avatar_url });
            error = res.error;
        }

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update Avatar Error:", error);
        return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
    }
}
