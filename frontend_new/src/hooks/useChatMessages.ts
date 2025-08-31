import { useState, useRef, useEffect } from "react";
import formatTimestamp from "@/utils/formatTimestamp";

interface Message {
  id: number;
  type: "bot" | "user";
  content: string;
  timestamp: Date;
}

export default function useChatMessages(initialBotMessage: Message) {
  const [messages, setMessages] = useState<Message[]>([initialBotMessage]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return {
    messages,
    setMessages,
    messagesEndRef,
    inputRef,
    formatTimestamp
  };
}
