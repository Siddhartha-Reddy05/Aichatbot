import { Bot, User, Loader2 } from "lucide-react";

interface Props {
  messages: { id: number; type: "bot" | "user"; content: string; timestamp: Date }[];
  formatTimestamp: (timestamp: Date) => string;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatMessages({ messages, formatTimestamp, isLoading, messagesEndRef }: Props) {
  return (
    <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.type === "user"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  : "bg-white/10 text-white border border-white/20"
              }`}
            >
              <div className="flex items-start space-x-3">
                {message.type === "bot" && (
                  <div className="bg-gradient-to-r from-green-400 to-blue-500 p-1 rounded-full flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                {message.type === "user" && (
                  <div className="bg-white/20 p-1 rounded-full flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-2">{formatTimestamp(message.timestamp)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-green-400 to-blue-500 p-1 rounded-full">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing your question...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
