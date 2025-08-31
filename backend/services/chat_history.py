# chat_history.py
# In-memory chat history (single user)
history = []

def update_chat_history(user_input: str):
    """
    Append the new user message to the chat history.
    """
    history.append(user_input)

def get_chat_context() -> str:
    """
    Returns the last few messages as context for follow-up questions.
    """
    if not history:
        return ""

    # Limit history to last 3 messages for brevity
    recent_history = history[-3:]
    context = "\n".join(f"User: {q}" for q in recent_history)
    return context

def clear_chat_history():
    """
    Clear history when needed (e.g., on new upload).
    """
    global history
    history.clear()