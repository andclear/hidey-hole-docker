"use strict";

// Types kept simple to avoid TS worker bundling friction
interface RegexScript {
  id: string;
  regex?: string;
  replace?: string;
  flags?: string;
  scriptName?: string;
  findRegex?: string;
  replaceString?: string;
  placement?: number[];
  disabled?: boolean;
}

interface ChatMessageData {
  name?: string;
  is_user?: boolean;
  is_system?: boolean;
  send_date?: string;
  mes?: string;
  force_avatar?: string;
  extra?: unknown;
  cleanText?: string;
  htmlParts?: string[];
  renderParts?: { html?: string; css?: string[]; js?: string[] }[];
  is_raw_text?: boolean;
}

const applyRegexPipeline = (text: string, rules: RegexScript[]) => {
  if (!text) return "";
  let processed = text;
  for (const rule of rules || []) {
    if (rule && rule.disabled) continue;
    try {
      let pattern = rule.regex || rule.findRegex;
      let flags = rule.flags || "g";
      const replacement = (rule.replace ?? rule.replaceString ?? "") as string;
      if (!rule.regex && rule.findRegex && rule.findRegex.startsWith("/")) {
        const lastSlash = rule.findRegex.lastIndexOf("/");
        if (lastSlash > 0) {
          pattern = rule.findRegex.substring(1, lastSlash);
          flags = rule.findRegex.substring(lastSlash + 1);
          flags = flags.replace(/[^gimsuy]/g, "");
        }
      }
      if (pattern) {
        const re = new RegExp(pattern, flags);
        processed = processed.replace(re, replacement);
      }
    } catch {
      // skip faulty rule
    }
  }
  return processed;
};

const extractHtmlBlocks = (text: string) => {
  const htmlParts: string[] = [];
  const cleanText = text.replace(/(```(?:html|svg)[\s\S]*?```)/gi, (match) => {
    const codeContent = match.replace(/^```(?:html|svg)\n?|```$/gi, "");
    htmlParts.push(codeContent);
    return "";
  });
  return { cleanText, htmlParts };
};

  self.addEventListener("message", (evt: MessageEvent) => {
  const { text, rawMessages, rules, page = 1, limit = 20 } = evt.data as { text?: string; rawMessages?: ChatMessageData[]; rules: RegexScript[]; page?: number; limit?: number };
  
  const allMessages: ChatMessageData[] = [];

  const extractRenderParts = (content: string) => {
    // We want to capture ALL code blocks to correctly group them.
    // Also we want to preserve newlines in the clean text as much as possible.
    const tokens: Array<{ index: number; lang: string; code: string; raw: string }> = [];
    const re = /```([a-z0-9+-]*)\n([\s\S]*?)```/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const lang = String(m[1] || "").toLowerCase();
      const code = m[2] || "";
      tokens.push({ index: m.index, lang, code, raw: m[0] });
    }
    
    // Remove blocks from cleanText but keep structure
    let clean = content;
    // We replace from end to start to not mess up indices if we were using them, 
    // but here we use string replace. Since tokens are unique raw strings, it's safer.
    // However, if there are duplicates, replace might replace the first one.
    // Better to reconstruct the string or use a robust replacement.
    // For now, let's assume raw blocks are unique enough or just replace all.
    // Actually, simple replacement is risky if identical blocks exist.
    // Let's use split/join or string slicing based on indices.
    
    // Reconstruct clean string excluding the blocks
    if (tokens.length > 0) {
      let lastIndex = 0;
      let newClean = "";
      for (const t of tokens) {
        newClean += content.substring(lastIndex, t.index);
        lastIndex = t.index + t.raw.length;
      }
      newClean += content.substring(lastIndex);
      clean = newClean;
    }

    const parts: { html?: string; css?: string[]; js?: string[] }[] = [];
    let cssBuf: string[] = [];
    let jsBuf: string[] = [];
    
    for (const t of tokens) {
      if (t.lang === "css") {
        cssBuf.push(t.code);
        continue;
      }
      if (t.lang === "js" || t.lang === "javascript") {
        jsBuf.push(t.code);
        continue;
      }
      if (t.lang === "html" || t.lang === "svg" || t.lang === "xml") {
        parts.push({ html: t.code, css: [...cssBuf], js: [...jsBuf] });
        cssBuf = [];
        jsBuf = [];
        continue;
      }
    }
    
    // Leftover CSS/JS without HTML? Attach to an empty HTML part or a special part.
    if (cssBuf.length || jsBuf.length) {
      parts.push({ html: "", css: cssBuf, js: jsBuf });
    }
    
    return { cleanText: clean, renderParts: parts };
  };

  if (rawMessages && rawMessages.length > 0) {
      // Case 1: Pre-parsed JSON objects (e.g. from backend pagination or client cache)
      // Just process regex/html for them
      for (const msg of rawMessages) {
          if (msg.mes) {
            const { cleanText, renderParts } = extractRenderParts(msg.mes);
            const pipelined = applyRegexPipeline(cleanText, rules || []);
            msg.cleanText = pipelined;
            msg.renderParts = renderParts;
          }
          allMessages.push(msg);
      }
  } else if (text) {
      // Case 2: Raw text (JSONL or TXT)
      // We need to parse all, but ONLY process regex/html for the requested page to be fast.
      // Wait, if we parse ALL 50MB text here, it might still be slow?
      // Yes, but it's in a worker. 
      // Optimization: For TXT, we can regex search. For JSONL, we split by newline.
      
      // Check if content is JSON/JSONL
      let isJson = false;
      let firstLine = "";
      try {
        firstLine = text.trim().split('\n')[0];
        if (firstLine && (firstLine.startsWith('{') || firstLine.startsWith('['))) {
            JSON.parse(firstLine.startsWith('[') ? text : firstLine);
            isJson = true;
        }
      } catch {}

      if (isJson) {
          const lines = text.split("\n");
          // Filter valid lines first to get total count
          // OPTIMIZATION: Don't parse ALL lines if array of objects, 
          // but for JSONL we have to split.
          // For HUGE JSONL (1MB is small, but if 50MB), parsing all JSON.parse(line) 
          // in a loop is slow (25s mentioned).
          // We need to NOT parse everything if possible, or parse faster.
          // But we need the total count and the specific slice.
          
          // Fast Scan for Newlines to get count and offsets?
          // If we just split by newline, that's fast.
          // The slow part is `JSON.parse` on every line.
          // So let's ONLY parse the lines we need for the current page + preload.
          
          const total = lines.length; // Approximate if empty lines exist
          // Let's refine total by filtering empty lines only when slicing?
          // No, that messes up index.
          // Let's assume standard JSONL where each line is valid or empty.
          // We can map indices of valid lines?
          
          const validLineIndices: number[] = [];
          for(let i=0; i<lines.length; i++) {
              if(lines[i].trim()) validLineIndices.push(i);
          }
          const trueTotal = validLineIndices.length;
          
          // Pagination Logic using indices
          // Preload Logic: Load current page + next 2 pages
          const startIdx = (page - 1) * limit;
          const endIdx = startIdx + (limit * 3); // Load 3 pages (current + next 2)
          
          // Helper to parse specific lines
          const parseLines = (indices: number[]) => {
              const results: ChatMessageData[] = [];
              for(const idx of indices) {
                  try {
                      const line = lines[idx];
                      const msgs: ChatMessageData | ChatMessageData[] = JSON.parse(line);
                      if (Array.isArray(msgs)) results.push(...msgs);
                      else results.push(msgs);
                  } catch {}
              }
              return results;
          };

          const pagedIndices = validLineIndices.slice(startIdx, startIdx + limit);
          const pagedMessages = parseLines(pagedIndices);
          
          // Process Current Page
          for (const msg of pagedMessages) {
              if (msg.mes) {
                const { cleanText, renderParts } = extractRenderParts(msg.mes);
                const pipelined = applyRegexPipeline(cleanText, rules || []);
                msg.cleanText = pipelined;
                msg.renderParts = renderParts;
              }
              allMessages.push(msg);
          }
          
          // Process Next 2 Pages for Preloading
          const preloadData: Record<number, ChatMessageData[]> = {};
          for (let i = 1; i <= 2; i++) {
              const nextPage = page + i;
              const pStart = (nextPage - 1) * limit;
              if (pStart >= trueTotal) break;
              
              const nextIndices = validLineIndices.slice(pStart, pStart + limit);
              const nextRawMessages = parseLines(nextIndices);
              const processedNext: ChatMessageData[] = [];
              
              for (const msg of nextRawMessages) {
                  const msgClone = { ...msg }; 
                  if (msgClone.mes) {
                    const { cleanText, renderParts } = extractRenderParts(msgClone.mes);
                    const pipelined = applyRegexPipeline(cleanText, rules || []);
                    msgClone.cleanText = pipelined;
                    msgClone.renderParts = renderParts;
                  }
                  processedNext.push(msgClone);
              }
              preloadData[nextPage] = processedNext;
          }
          
          (self as unknown as { postMessage: (msg: unknown) => void }).postMessage({ 
              messages: allMessages,
              total: trueTotal,
              preload: preloadData
          });
          return;

      } else {
          // Handle TXT format
          // ... (Existing TXT logic) ...
          
          const pattern = /\[\s*#(\d+)\s*\](.*)/g;
          let match;
          const parsedTxtMessages: ChatMessageData[] = [];
          
          while ((match = pattern.exec(text)) !== null) {
              const id = match[1];
              const nameOnLine = match[2].trim(); 
              const startIndex = match.index + match[0].length;
              
              const nextMatch = /\[\s*#(\d+)\s*\]/.exec(text.substring(startIndex));
              const endIndex = nextMatch ? startIndex + nextMatch.index : text.length;
              
              const content = text.substring(startIndex, endIndex).trim();
              const name = nameOnLine || "Unknown";
              
              parsedTxtMessages.push({
                  name,
                  mes: content,
                  is_user: name.toLowerCase() === 'user' || name.toLowerCase() === 'you',
                  extra: { id },
                  is_raw_text: true
              });
          }
          
          // Pagination
          const total = parsedTxtMessages.length;
          const start = (page - 1) * limit;
          const pagedMessages = parsedTxtMessages.slice(start, start + limit);
          
          for (const msg of pagedMessages) {
              if (msg.mes) {
                  // Only apply regex for visible messages
                  const pipelined = applyRegexPipeline(msg.mes, rules || []);
                  msg.cleanText = pipelined;
                  msg.renderParts = [];
              }
              allMessages.push(msg);
          }
          
          // Preload TXT
          const preloadData: Record<number, ChatMessageData[]> = {};
          for (let i = 1; i <= 2; i++) {
              const nextPage = page + i;
              const pStart = (nextPage - 1) * limit;
              const pEnd = pStart + limit;
              if (pStart >= total) break;
              
              const nextMessages = parsedTxtMessages.slice(pStart, pEnd);
              const processedNext: ChatMessageData[] = [];
              
              for (const msg of nextMessages) {
                  const msgClone = { ...msg };
                  if (msgClone.mes) {
                      const pipelined = applyRegexPipeline(msgClone.mes, rules || []);
                      msgClone.cleanText = pipelined;
                      msgClone.renderParts = [];
                  }
                  processedNext.push(msgClone);
              }
              preloadData[nextPage] = processedNext;
          }
          
          (self as unknown as { postMessage: (msg: unknown) => void }).postMessage({ 
              messages: allMessages,
              total: total,
              preload: preloadData
          });
          return;
      }
  }

  (self as unknown as { postMessage: (msg: unknown) => void }).postMessage({ messages: allMessages, total: allMessages.length });
});
