import { DollarSign } from "lucide-react";

export default function ChatHeader() {
  return (
    <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center space-x-3">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Finance Assistant</h1>
          <p className="text-gray-300 text-sm">Your AI-powered financial advisor</p>
        </div>
      </div>
    </header>
  );
}
