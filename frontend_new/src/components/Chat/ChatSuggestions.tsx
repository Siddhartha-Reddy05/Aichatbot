interface Props {
    suggestions: string[];
    onSelect: (question: string) => void;
  }
  
  export default function ChatSuggestions({ suggestions, onSelect }: Props) {
    return (
      <div className="px-6 pb-4">
        <p className="text-gray-300 text-sm mb-3">Try asking about:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((question, index) => (
            <button
              key={index}
              onClick={() => onSelect(question)}
              className="bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-lg border border-white/20 transition-all duration-200 hover:scale-105"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    );
  }
  