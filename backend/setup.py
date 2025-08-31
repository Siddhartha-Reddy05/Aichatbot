from setuptools import setup, find_packages

setup(
    name="document-ai-assistant",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "pydantic",
        "python-multipart",
        "qdrant-client",
        "sentence-transformers",
        "PyMuPDF",
        "numpy",
        "google-generativeai",
        "scikit-learn",
        "python-dotenv",
        "pdf2image",
        "pytesseract",
        "httpx",
        "beautifulsoup4",
        "readability-lxml",
        "trafilatura"
    ],
)