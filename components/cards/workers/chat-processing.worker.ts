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
  const { text, rules } = evt.data as { text: string; rules: RegexScript[] };
  const messages: ChatMessageData[] = [];

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

  // Check if content is JSON/JSONL
  let isJson = false;
  try {
    const firstLine = text.trim().split('\n')[0];
    if (firstLine && (firstLine.startsWith('{') || firstLine.startsWith('['))) {
        JSON.parse(firstLine.startsWith('[') ? text : firstLine);
        isJson = true;
    }
  } catch {}

  if (isJson) {
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line || !line.trim()) continue;
        try {
          // Handle array of messages or single JSON line
          let msgs: ChatMessageData | ChatMessageData[] = JSON.parse(line);
          if (!Array.isArray(msgs)) msgs = [msgs];

          for (const msg of msgs) {
              if (msg.mes) {
                const { cleanText, renderParts } = extractRenderParts(msg.mes);
                const pipelined = applyRegexPipeline(cleanText, rules || []);
                msg.cleanText = pipelined;
                msg.renderParts = renderParts;
              }
              messages.push(msg);
          }
        } catch {
          //
        }
      }
  } else {
      // Handle TXT format with [ #x ] separators
      // Requirement: The text on the same line as [ #x ] is the username
      // Example: [ #1 ] User
      //          Hello world
      const pattern = /\[\s*#(\d+)\s*\](.*)/g;
      
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
          const id = match[1];
          const nameOnLine = match[2].trim(); // Name is captured from the same line
          const startIndex = match.index + match[0].length;
          
          // Find end of this message (start of next message or end of file)
          const nextMatch = /\[\s*#(\d+)\s*\]/.exec(text.substring(startIndex));
          const endIndex = nextMatch ? startIndex + nextMatch.index : text.length;
          
          const content = text.substring(startIndex, endIndex).trim();
          
          // Use captured name, default to "Unknown" only if empty
          const name = nameOnLine || "Unknown";
          
          // For TXT, we do NOT render HTML. We strip it or just treat as plain text.
          const pipelined = applyRegexPipeline(content, rules || []);
          
          messages.push({
              name,
              mes: content,
              cleanText: pipelined,
              renderParts: [], // No HTML rendering
              is_user: name.toLowerCase() === 'user' || name.toLowerCase() === 'you',
              extra: { id },
              is_raw_text: true
          });
      }
  }

  (self as unknown as { postMessage: (msg: unknown) => void }).postMessage({ messages });
});
