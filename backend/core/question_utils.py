def is_document_question(question: str) -> bool:
    document_keywords = [
        "document", "file", "page", "section", "chapter", "clause",
        "agreement", "contract", "report", "article", "paper", "study",
        "data", "information", "details", "summary", "explain", "what does it say",
        "where is", "find", "locate", "show me", "tell me about"
    ]

    question_lower = question.lower()
    return any(keyword in question_lower for keyword in document_keywords)


def is_summary_question(question: str) -> bool:
    """
    Returns True if the question looks like a summary-style query.
    """
    triggers = ["summarize", "summary", "overview", "brief", "main points", "key points"]
    question_lower = question.lower()
    return any(trigger in question_lower for trigger in triggers)

def is_specific_document_type(text: str, doc_type_keywords: list) -> bool:
    """
    Check if the document content matches specific document type keywords.
    """
    text_lower = text.lower()
    match_count = sum(keyword in text_lower for keyword in doc_type_keywords)
    return match_count >= 3  # Adjust threshold as needed

# Example document type detectors
def is_business_document(text: str) -> bool:
    business_keywords = [
        "business", "strategy", "market", "financial", "revenue", "profit",
        "investment", "growth", "plan", "analysis", "metrics", "kpi",
        "roi", "budget", "forecast", "quarterly", "annual"
    ]
    return is_specific_document_type(text, business_keywords)

def is_legal_document(text: str) -> bool:
    legal_keywords = [
        "agreement", "contract", "party", "clause", "non-disclosure",
        "nda", "terms", "obligations", "jurisdiction", "employment",
        "confidential", "liability", "termination", "breach", "law", "legal"
    ]
    return is_specific_document_type(text, legal_keywords)

def is_technical_document(text: str) -> bool:
    technical_keywords = [
        "technical", "specification", "requirements", "system", "software",
        "hardware", "api", "interface", "protocol", "algorithm", "code",
        "development", "engineering", "design", "architecture"
    ]
    return is_specific_document_type(text, technical_keywords)

# def is_business_document(text: str) -> bool:
#     business_keywords = [
#         "business", "strategy", "market", "financial", "revenue", "profit",
#         "investment", "growth", "plan", "analysis", "metrics", "kpi",
#         "roi", "budget", "forecast", "quarterly", "annual"
#     ]
#     return is_specific_document_type(text, business_keywords)