
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { cardId } = await request.json();
    if (!cardId) {
        return NextResponse.json({ error: "Card ID required" }, { status: 400 });
    }

    // 1. Get Active AI Channel
    const { data: channels } = await supabaseAdmin
        .from('ai_channels')
        .select('*')
        .eq('is_active', true)
        .limit(1);
    
    const activeChannel = channels && channels.length > 0 ? channels[0] : null;

    if (!activeChannel) {
        return NextResponse.json({ error: "No active AI channel configured" }, { status: 400 });
    }

    // 2. Fetch Card Data
    const { data: card, error: cardError } = await supabaseAdmin
        .from('character_cards')
        .select('name, description, personality, scenario, first_message, creator_notes, data')
        .eq('id', cardId)
        .single();

    if (cardError || !card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // 2.5 Fetch Existing Tags to avoid duplicates
    const { data: allTags } = await supabaseAdmin
        .from('tags')
        .select('name');
    
    const existingTagsList = allTags?.map(t => t.name).join(", ") || "暂无现有标签";

    // 3. Construct Prompt
    const systemPrompt = `你是一个角色卡分析专家。请根据以下角色信息，生成一段简短的中文简介（150字以内）和 3-5 个关键标签。

系统当前已有的标签库如下：
[${existingTagsList}]
    
必须严格输出纯 JSON 格式，不要包含 Markdown 代码块标记或其他废话。格式如下：
{
  "summary": "这里是简介内容...",
  "tags": ["标签1", "标签2", "标签3"]
}

注意：
1. 简介要抓住角色核心魅力，适合展示在卡片首页。
2. **标签生成规则**：请优先从上述【系统已有的标签库】中选择最合适的标签。只有当现有标签完全无法描述该角色特征时，才创建新标签，避免标签同义词泛滥。
3. 标签要精准，涵盖性格、种族、职业或萌点。
4. 如果原文是英文，请翻译并润色为中文。`;

    const userContent = `Name: ${card.name}
Description: ${card.description || ""}
Personality: ${card.personality || ""}
Scenario: ${card.scenario || ""}
First Message: ${card.first_message || ""}
Creator Notes: ${card.creator_notes || ""}
`;

    // 4. Call AI
    const response = await fetch(`${activeChannel.base_url}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeChannel.api_key}`
        },
        body: JSON.stringify({
            model: activeChannel.model || "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API Error: ${response.status} - ${errText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("Empty response from AI");
    }

    // 5. Parse JSON
    let result;
    try {
        // Try to strip markdown code blocks if present
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleanContent);
    } catch (e) {
        console.error("AI JSON Parse Error", content);
        throw new Error("Failed to parse AI response");
    }

    if (!result.summary) {
        throw new Error("Invalid AI response format");
    }

    // 6. Update Database
    // Update summary
    await supabaseAdmin
        .from('character_cards')
        .update({ ai_summary: result.summary })
        .eq('id', cardId);

    // Update tags
    // We need to find or create tags and then link them
    if (result.tags && Array.isArray(result.tags)) {
        for (const tagName of result.tags) {
            // Check if tag exists
            const { data: existingTag } = await supabaseAdmin
                .from('tags')
                .select('id')
                .eq('name', tagName)
                .single();

            let tagId;
            if (existingTag) {
                tagId = existingTag.id;
            } else {
                // Create tag
                const { data: newTag } = await supabaseAdmin
                    .from('tags')
                    .insert({ name: tagName })
                    .select('id')
                    .single();
                if (newTag) tagId = newTag.id;
            }

            if (tagId) {
                // Link tag to card (ignore duplicates)
                await supabaseAdmin
                    .from('card_tags')
                    .upsert({ card_id: cardId, tag_id: tagId }, { onConflict: 'card_id,tag_id' });
            }
        }
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
