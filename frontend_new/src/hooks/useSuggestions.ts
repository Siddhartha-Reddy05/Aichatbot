import { useMemo } from 'react';
import { Message } from '@/types/chat';

interface UseSuggestionsProps {
  messages: Message[];
  selectedFileName?: string;
}

const GENERAL_SUGGESTIONS = [
  "Can you summarize the key points?",
  "What are the main topics covered?",
  "Are there any important dates or deadlines?",
  "What are the next steps or action items?"
];

const DOCUMENT_SPECIFIC_SUGGESTIONS = {
  pdf: [
    "Extract the main headings from this document",
    "Summarize this document in bullet points",
    "What are the key findings in this document?",
    "Extract any tables or figures from this document"
  ],
  contract: [
    "What are the key terms and conditions?",
    "What are the termination clauses?",
    "What are the payment terms?",
    "What are the key obligations of each party?"
  ],
  financial: [
    "What are the key financial metrics?",
    "Can you analyze the revenue trends?",
    "What are the main expenses?",
    "What are the profit margins?"
  ],
  default: [
    "What is this document about?",
    "Can you provide a summary?",
    "What are the key points?",
    "Are there any important dates or deadlines?"
  ]
};

export default function useSuggestions({ messages, selectedFileName }: UseSuggestionsProps) {
  const getDocumentType = (fileName?: string): keyof typeof DOCUMENT_SPECIFIC_SUGGESTIONS => {
    if (!fileName) return 'default';
    
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.pdf')) return 'pdf';
    if (lowerName.includes('contract') || lowerName.includes('agreement')) return 'contract';
    if (lowerName.includes('financial') || lowerName.includes('report') || lowerName.includes('statement')) return 'financial';
    
    return 'default';
  };

  const contextAwareSuggestions = useMemo(() => {
    // If no messages yet, return general suggestions
    if (messages.length === 0) {
      return GENERAL_SUGGESTIONS;
    }

    // Get the last message to determine context
    const lastMessage = messages[messages.length - 1];
    const documentType = getDocumentType(selectedFileName);
    
    // If the last message was from the bot, provide follow-up questions
    if (lastMessage.type === 'bot') {
      return [
        "Can you elaborate on that?",
        "What does that mean?",
        "Can you provide more details?",
        ...DOCUMENT_SPECIFIC_SUGGESTIONS[documentType]
      ];
    }
    
    // If we have a file selected, provide document-specific suggestions
    if (selectedFileName) {
      return DOCUMENT_SPECIFIC_SUGGESTIONS[documentType];
    }
    
    // Default to general suggestions
    return GENERAL_SUGGESTIONS;
  }, [messages, selectedFileName]);

  return {
    suggestions: contextAwareSuggestions,
    isLoading: false
  };
}