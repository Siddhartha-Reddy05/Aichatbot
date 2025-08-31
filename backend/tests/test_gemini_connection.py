# test_gemini_connection.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

try:
    model = genai.GenerativeModel("gemini-1.5-flash")  # Use the correct model name
    response = model.generate_content("Test connection to Gemini")
    print("✅ Gemini working:", response.text)
except Exception as e:
    print("❌ Gemini connection failed:", e)