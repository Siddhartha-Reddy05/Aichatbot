# gemini_setup.py
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load the API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize Gemini 2.0 Flash model
model = genai.GenerativeModel("models/gemini-2.0-flash")

# ✅ Streaming response generator
def stream_answer(prompt):
    try:
        response = model.generate_content(
            prompt,
            stream=True,  #  correct way to enable streaming
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        print("❌ Streaming error:", str(e))
        yield f"❌ Streaming failed: {str(e)}"