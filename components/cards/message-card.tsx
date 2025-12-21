
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, User, Bot } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IframeRenderer } from "./iframe-renderer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export interface ChatMessageData {
  name?: string;
  is_user?: boolean;
  is_system?: boolean;
  send_date?: string;
  mes?: string;
  force_avatar?: string;
  extra?: unknown;
  // Pre-processed data
  cleanText?: string;
  htmlParts?: string[];
  renderParts?: { html?: string; css?: string[]; js?: string[] }[];
  is_raw_text?: boolean;
}

interface MessageCardProps {
  message: ChatMessageData;
  index: number;
  onExpand?: (index: number) => void;
  version?: number;
}

export function MessageCard({ message, index, onExpand, version = 0 }: MessageCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isUser = message.is_user;
  const isSystem = message.is_system;
  
  // Format date if possible
  let dateDisplay = message.send_date;
  try {
      if (message.send_date) {
          // Attempt to parse timestamp if it looks like one
          const ts = parseInt(message.send_date);
          if (!isNaN(ts) && ts > 1000000000) {
              dateDisplay = format(new Date(ts), "yyyy-MM-dd HH:mm:ss");
          }
      }
  } catch (e) {}

  return (
    <Card className={cn(
      "mb-4 transition-all duration-200 border-l-4",
      isUser ? "border-l-primary/50 bg-muted/10" : "border-l-secondary bg-card",
      isSystem && "border-l-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="p-3 pb-2 flex flex-row items-center gap-3 space-y-0">
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={message.force_avatar} className="object-cover" />
          <AvatarFallback className="text-xs">
            {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 grid gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {message.name || (isUser ? "User" : "System")}
            </span>
            {dateDisplay && (
              <span className="text-[10px] text-muted-foreground tabular-nums opacity-70">
                {dateDisplay}
              </span>
            )}
          </div>
          {/* Optional: Model info or token count could go here */}
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => {
            const next = !isCollapsed;
            setIsCollapsed(next);
            if (!next && onExpand) {
              // Defer scrolling to allow render
              requestAnimationFrame(() => onExpand(index));
            }
          }}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="p-3 pt-0 pl-14">
            <div data-version={version} />
            {/* Text or HTML Content */}
            {message.cleanText && (() => {
                const htmlLike = !message.is_raw_text && /<([a-z][^>\s]*)\b[^>]*>([\s\S]*?)<\/\1>/i.test(message.cleanText);
                if (htmlLike) {
                  return (
                    <IframeRenderer
                      content={message.cleanText}
                      id={`msg-${index}-inline-html`}
                      className="rounded-md border-none bg-transparent"
                    />
                  );
                }
                return (
                  // Force whitespace wrap and break words for long text
                  <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                            // Override paragraph to preserve whitespace styling of container
                            p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                            // Ensure code blocks wrap
                            code: ({node, ...props}) => <code {...props} className="break-words whitespace-pre-wrap" />,
                            pre: ({node, ...props}) => <pre {...props} className="whitespace-pre-wrap break-words bg-transparent p-2 rounded border border-border" />
                        }}
                      >
                        {message.cleanText}
                      </ReactMarkdown>
                  </div>
                );
            })()}

            {/* HTML/Iframe Content */}
            {message.renderParts && message.renderParts.length > 0 && (
                <div className="mt-3 space-y-3">
                    {message.renderParts.map((part, i) => (
                        <IframeRenderer 
                            key={i} 
                            content={part.html || ""} 
                            styles={part.css || []}
                            scripts={part.js || []}
                            id={`msg-${index}-part-${i}`}
                            className="rounded-md border-none bg-transparent"
                        />
                    ))}
                </div>
            )}
        </CardContent>
      )}
    </Card>
  );
}
