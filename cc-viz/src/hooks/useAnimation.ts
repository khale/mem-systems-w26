import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '../protocols/types';

export interface AnimatedMessage extends Message {
  animationProgress: number; // 0 to 1
}

export function useAnimation(
  messages: Message[],
  isPlaying: boolean,
  speed: number
): AnimatedMessage[] {
  const [animatedMessages, setAnimatedMessages] = useState<AnimatedMessage[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    // Initialize new messages with progress 0
    setAnimatedMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const newMessages = messages.filter(m => !existingIds.has(m.id));

      // Keep existing messages that are still in the list
      const messageIds = new Set(messages.map(m => m.id));
      const kept = prev.filter(m => messageIds.has(m.id));

      return [
        ...kept,
        ...newMessages.map(m => ({ ...m, animationProgress: 0 })),
      ];
    });
  }, [messages]);

  useEffect(() => {
    if (!isPlaying || animatedMessages.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Progress rate: complete animation in ~500ms at speed 1
      const progressRate = (deltaTime / 500) * speed;

      setAnimatedMessages(prev =>
        prev.map(m => ({
          ...m,
          animationProgress: Math.min(1, m.animationProgress + progressRate),
        }))
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, animatedMessages.length, speed]);

  return animatedMessages;
}

// Calculate position for a message along its path
export function getMessagePosition(
  message: AnimatedMessage,
  nodePositions: Map<number | string, { x: number; y: number }>,
  busY?: number
): { x: number; y: number } {
  const fromKey = typeof message.from === 'number' ? message.from : message.from;
  const toKey = typeof message.to === 'number' ? message.to : message.to;

  const fromPos = nodePositions.get(fromKey) ?? { x: 0, y: 0 };
  let toPos = nodePositions.get(toKey) ?? { x: 0, y: 0 };

  // For bus messages, animate to/from the bus line
  if (message.to === 'bus' && busY !== undefined) {
    toPos = { x: fromPos.x, y: busY };
  }

  const progress = message.animationProgress;

  return {
    x: fromPos.x + (toPos.x - fromPos.x) * progress,
    y: fromPos.y + (toPos.y - fromPos.y) * progress,
  };
}
