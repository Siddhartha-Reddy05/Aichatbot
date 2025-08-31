from prompts.legalprompt import system_prompt as GENERAL_SYSTEM_PROMPT

def format_prompt(context: str, question: str, history_context: str = "") -> str:
    prompt = (
        f"{GENERAL_SYSTEM_PROMPT}\n\n"
        "Include references to the [Source: ... - Page ...] in your answer wherever relevant.\n\n"
        f"{history_context}\n\n"
        f"--- DOCUMENT CONTEXT START ---\n{context}\n--- DOCUMENT CONTEXT END ---\n\n"
        f"User Question: {question}\n\n"
        "Answer:"
    )
    return prompt