"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface AIAnalysisTask {
  cardId: string;
  cardName: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  result?: {
      summary: string;
      tags: string[];
  };
}

interface AIAnalysisContextType {
  queue: AIAnalysisTask[];
  addTask: (cardId: string, cardName: string) => void;
  removeTask: (cardId: string) => void;
  getTask: (cardId: string) => AIAnalysisTask | undefined;
  isProcessing: boolean;
}

const AIAnalysisContext = createContext<AIAnalysisContextType | null>(null);

const MAX_CONCURRENT = 3;

export function AIAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<AIAnalysisTask[]>([]);
  const processingRef = useRef<Set<string>>(new Set());
  
  // Persist queue to localStorage to survive refreshes (optional, but good for UX)
  // For simplicity, we'll just keep it in memory for now, or maybe basic persistence
  
  const processQueue = useCallback(async () => {
    const currentQueue = [...queue];
    const processing = processingRef.current;
    
    // Find pending tasks
    const pendingTasks = currentQueue.filter(t => t.status === "pending");
    
    if (pendingTasks.length === 0) return;
    if (processing.size >= MAX_CONCURRENT) return;
    
    // Take next tasks up to limit
    const availableSlots = MAX_CONCURRENT - processing.size;
    const tasksToStart = pendingTasks.slice(0, availableSlots);
    
    for (const task of tasksToStart) {
        startTask(task);
    }
  }, [queue]);

  const startTask = async (task: AIAnalysisTask) => {
      // Optimistic update status
      updateTaskStatus(task.cardId, "processing");
      processingRef.current.add(task.cardId);
      
      try {
          const res = await fetch("/api/ai/analyze-card", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cardId: task.cardId })
          });
          
          const data = await res.json();
          
          if (!res.ok || !data.success) {
              throw new Error(data.error || "Analysis failed");
          }
          
          updateTaskStatus(task.cardId, "completed", undefined, data.data);
          toast.success(`AI分析完成: ${task.cardName}`);
          
          // Trigger a global event so pages can refresh data if needed
          window.dispatchEvent(new CustomEvent('card-updated', { detail: { cardId: task.cardId } }));
          
      } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          updateTaskStatus(task.cardId, "failed", errMsg);
          toast.error(`AI分析失败 (${task.cardName}): ${errMsg}`);
      } finally {
          processingRef.current.delete(task.cardId);
          // Trigger next check
          // We need to wait a bit or just trigger state update which triggers effect
          // Since we updated state in updateTaskStatus, effect will run
      }
  };

  const updateTaskStatus = (cardId: string, status: AIAnalysisTask['status'], error?: string, result?: any) => {
      setQueue(prev => prev.map(t => 
          t.cardId === cardId ? { ...t, status, error, result } : t
      ));
  };

  const addTask = useCallback((cardId: string, cardName: string) => {
      setQueue(prev => {
          if (prev.find(t => t.cardId === cardId)) {
              // Already in queue, maybe retry if failed?
              return prev.map(t => t.cardId === cardId && t.status === 'failed' 
                  ? { ...t, status: 'pending', error: undefined } 
                  : t
              );
          }
          return [...prev, { cardId, cardName, status: "pending" }];
      });
      toast.info(`已加入分析队列: ${cardName}`);
  }, []);

  const removeTask = useCallback((cardId: string) => {
      setQueue(prev => prev.filter(t => t.cardId !== cardId));
  }, []);

  const getTask = useCallback((cardId: string) => {
      return queue.find(t => t.cardId === cardId);
  }, [queue]);

  // Watch queue changes to trigger processing
  useEffect(() => {
      processQueue();
  }, [queue, processQueue]);

  return (
    <AIAnalysisContext.Provider value={{ queue, addTask, removeTask, getTask, isProcessing: processingRef.current.size > 0 }}>
      {children}
    </AIAnalysisContext.Provider>
  );
}

export function useAIAnalysis() {
  const context = useContext(AIAnalysisContext);
  if (!context) {
    throw new Error("useAIAnalysis must be used within AIAnalysisProvider");
  }
  return context;
}
