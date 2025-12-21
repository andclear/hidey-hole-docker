
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface IframeRendererProps {
  content: string;
  id: string;
  className?: string;
  styles?: string[];
  scripts?: string[];
}

export function IframeRenderer({ content, id, className, styles = [], scripts = [] }: IframeRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(100);
  const [baseHref, setBaseHref] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseHref(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "TH_ADJUST_IFRAME_HEIGHT" &&
        event.data?.iframe_name === id
      ) {
        setHeight(event.data.height);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [id]);

  useEffect(() => {
    const onResize = () => {
      const winHeight = window.innerHeight;
      iframeRef.current?.contentWindow?.postMessage(
        { type: "TH_UPDATE_VIEWPORT_HEIGHT", height: winHeight },
        "*"
      );
    };
    window.addEventListener("resize", onResize);
    // Delay initial post to ensure iframe is loaded
    setTimeout(onResize, 100);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Convert `min-height: Xvh` patterns in content to use CSS variable --TH-viewport-height
  const replaceVhInContent = (raw: string): string => {
    const convert = (value: string) =>
      value.replace(/(\d+(?:\.\d+)?)vh\b/gi, (_m, v) => {
        const n = parseFloat(String(v));
        if (!isFinite(n)) return String(v);
        const VAR = "var(--TH-viewport-height)";
        return n === 100 ? VAR : `calc(${VAR} * ${n / 100})`;
      });
    let s = raw;
    s = s.replace(
      /(min-height\s*:\s*)([^;{}]*?\d+(?:\.\d+)?vh)(?=\s*[;}])/gi,
      (_m, p1: string, p2: string) => `${p1}${convert(p2)}`
    );
    s = s.replace(
      /(style\s*=\s*(["']))([^"'"]*?)(\2)/gi,
      (match, p1: string, _q: string, styleContent: string, p4: string) => {
        if (!/min-height\s*:\s*[^;]*vh/i.test(styleContent)) return match;
        const replaced = styleContent.replace(
          /(min-height\s*:\s*)([^;]*?\d+(?:\.\d+)?vh)/gi,
          (_m, a: string, b: string) => `${a}${convert(b)}`
        );
        return `${p1}${replaced}${p4}`;
      }
    );
    s = s.replace(
      /(\.style\.minHeight\s*=\s*(["']))([\s\S]*?)(\2)/gi,
      (match, p1: string, _q: string, val: string, p4: string) => {
        if (!/\b\d+(?:\.\d+)?vh\b/i.test(val)) return match;
        const converted = convert(val);
        return `${p1}${converted}${p4}`;
      }
    );
    s = s.replace(
      /(setProperty\s*\(\s*(["'])min-height\2\s*,\s*(["']))([\s\S]*?)(\3\s*\))/gi,
      (match, p1: string, _q1: string, _q2: string, val: string, p6: string) => {
        if (!/\b\d+(?:\.\d+)?vh\b/i.test(val)) return match;
        const converted = convert(val);
        return `${p1}${converted}${p6}`;
      }
    );
    return s;
  };

  // Generate HTML Template
  // Inspired by JS-Slash-Runner's implementation
  const styleTags = styles.map((s) => `<style>${s}</style>`).join("");
  const scriptTags = scripts.map((j) => `<script>${j}</script>`).join("");
  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${baseHref ? `<base href="${baseHref}"/>` : ""}
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { 
    margin: 0 !important; 
    padding: 0; 
    overflow: hidden !important; 
    max-width: 100% !important;
    background-color: transparent;
    /* Ensure body can grow */
    height: auto; 
    min-height: 0;
  }
  .user_avatar,.user-avatar{ background-size: cover; background-position: center; }
  .char_avatar,.char-avatar{ background-size: cover; background-position: center; }
</style>
${styleTags}
<script>
(function() {
  const ID = "${id}";
  let scheduled = false;

  function postHeight() {
    scheduled = false;
    const bodyHeight = document.body.scrollHeight;
    const docHeight = document.documentElement.offsetHeight;
    // Use the larger of body or doc height to catch all content
    const height = Math.max(bodyHeight, docHeight);
    
    if (height > 0) {
      window.parent.postMessage({ 
        type: 'TH_ADJUST_IFRAME_HEIGHT', 
        iframe_name: ID, 
        height: height 
      }, '*');
    }
  }

  function schedulePost() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(postHeight);
  }

  window.addEventListener('load', schedulePost);
  const resizeObserver = new ResizeObserver(schedulePost);
  if (document.body) resizeObserver.observe(document.body);
  resizeObserver.observe(document.documentElement);
  
  // Also observe mutations just in case
  const mutationObserver = new MutationObserver(schedulePost);
  if (document.body) {
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  // Receive viewport height updates from parent
  window.addEventListener('message', (e) => {
    if (e?.data?.type === 'TH_UPDATE_VIEWPORT_HEIGHT') {
      const h = e.data.height;
      document.documentElement.style.setProperty('--TH-viewport-height', h + 'px');
      schedulePost();
    }
  });
})();
</script>
</head>
<body>
${replaceVhInContent(content)}
${scriptTags}
</body>
</html>
  `;

  return (
    <iframe
      ref={iframeRef}
      id={id}
      srcDoc={htmlTemplate}
      // Removed transition to prevent ResizeObserver confusion during height changes
      className={cn("w-full border-none block bg-transparent", className)}
      style={{ height: `${height}px` }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
