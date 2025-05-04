import os
import google.generativeai as genai
# from google.generativeai.types import Content, Part # For structuring content
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import logging
from flask_cors import CORS

# --- Configuration ---
load_dotenv() # Load environment variables from .env file
# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

# --- CORS Configuration ---
# Define the specific origin(s) allowed to access your backend
# Use the origin shown in the error message
allowed_origins = ["https://emlyonbs.qualtrics.com", "https://emlyonbs.eu.qualtrics.com"]

# Apply CORS to your app, specifying allowed origins
CORS(app, origins=["https://emlyonbs.qualtrics.com", "https://emlyonbs.eu.qualtrics.com"])
# This applies CORS specifically to the /generate route for the specified origins.
# For simpler (but less secure) setup during development, you could use:
# CORS(app) # Allows all origins - NOT recommended for production
# --------------------------

# --- Define System Prompt ---
SYSTEM_PROMPT = """
You are a friendly and knowledgeable AI podcast recommendation assistant. Your goal is to help the user discover a great new podcast by asking targeted questions about their preferences.

**Your Primary Instructions:**

1.  **Be Conversational and Encouraging:** Maintain a friendly and approachable tone.
2.  **Ask Focused Questions:** Ask questions one or two at a time to gather information needed for a good recommendation. Don't overwhelm the user.
3.  **Gather Key Information:** Gradually collect details about the user's preferences. Essential information includes:
    *   **Topics of Interest:** What subjects is the user interested in? (e.g., true crime, comedy, technology, history, science, news, fiction, self-improvement).
    *   **Preferred Language(s):** What language(s) should the podcast be in?
    *   **Podcast Style/Format:** Does the user prefer interview formats, solo narration, panel discussions, storytelling, educational, etc.?
    *   **Desired Tone:** Is the user looking for something lighthearted, serious, investigative, humorous, relaxing, motivating?
    *   **Episode Length:** Does the user prefer short episodes (under 30 min), medium (30-60 min), or long (over 60 min)? (Optional, but helpful).
    *   **Examples (Optional):** Are there any podcasts the user already enjoys? This helps gauge their taste.
4.  **Adapt Your Questions:** Use the user's answers to ask relevant follow-up questions.
5.  **Conclude with a Specific Recommendation:** After gathering sufficient information, you MUST suggest ONE specific podcast title that fits the user's stated preferences. Briefly explain why this podcast is a good match.
6.  **Start Broadly:** Begin with a general, open-ended question to understand the user's primary interests unless the conversation history suggests otherwise.

**Example Starting Question (if history is empty):**

"Hello! I'd love to help you find your next favorite podcast. To start, what kind of topics or subjects usually catch your interest?"
"""
# -----------------------------

# --- Environment Variable Check ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logging.error("GEMINI_API_KEY environment variable not set.")
    # In a real application, you might want to exit or handle this more gracefully
    # For this example, we'll let it fail later if the key is needed.
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        logging.error(f"Failed to configure Google Generative AI: {e}")
        # Handle configuration error

# --- GenAI Model Configuration ---
# Choose the Gemini model (e.g., "gemini-1.5-flash", "gemini-pro")
# Make this configurable via environment variable if needed
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash-preview-04-17")
try:
    # Initialize the generative model
    # Add safety_settings and generation_config as needed
    model = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction=SYSTEM_PROMPT
    )
    logging.info(f"Successfully initialized GenerativeModel with {MODEL_NAME} and system instruction.")
except Exception as e:
    logging.error(f"Failed to initialize GenerativeModel ({MODEL_NAME}): {e}")
    model = None # Ensure model is None if initialization fails

# --- API Endpoint ---
@app.route('/generate', methods=['POST'])
def generate_text():
    """
    Handles POST requests with conversation history to generate text via Gemini API.
    CORS preflight OPTIONS requests are handled automatically by Flask-CORS.
    """
    if not GEMINI_API_KEY:
         logging.error("Cannot process request: GEMINI_API_KEY is not configured.")
         return jsonify({"error": "Server configuration error: API key missing."}), 500

    if not model:
        logging.error("Cannot process request: GenerativeModel failed to initialize.")
        return jsonify({"error": "Server configuration error: Model initialization failed."}), 500

    # --- Input Validation ---
    if not request.is_json:
        logging.warning("Received non-JSON request")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    incoming_history = data.get('history') # Expect 'history' key

    # --- Validate History ---
    if not incoming_history or not isinstance(incoming_history, list):
        logging.warning("Invalid or missing 'history' in request data")
        return jsonify({"error": "Invalid or missing 'history' (must be a list)"}), 400
    # Add more validation if needed (e.g., check structure of items in list)

    logging.info(f"Received history with {len(incoming_history)} messages.")

    # --- Gemini API Call ---
    try:
        logging.info(f"Sending request to Gemini model: {MODEL_NAME}")
        response = model.generate_content(
            contents=incoming_history # Pass only the history
        )
        # Check the google.generativeai documentation for gemini-1.5-flash-preview-0417
        # on how to best include system instructions. It might be a parameter
        # to generate_content or part of the model constructor.

        # --- Response Handling ---
        # Basic check if the response contains text
        if response.parts:
             generated_text = response.text # Access text directly via .text
             logging.info(f"Received response from Gemini: {generated_text[:50]}...") # Log snippet
             # Optional: Add PII detection/redaction here before sending back
             # Example placeholder: generated_text = redact_pii(generated_text)
             return jsonify({"generated_text": generated_text})
        else:
             # Handle cases where the response might be blocked or empty
             # See response.prompt_feedback for details if blocked
             logging.warning(f"Gemini response was empty or blocked. Feedback: {response.prompt_feedback}")
             error_message = "Failed to generate text. The prompt might have been blocked."
             # Check for specific block reasons if available
             if response.prompt_feedback and response.prompt_feedback.block_reason:
                 error_message += f" Reason: {response.prompt_feedback.block_reason.name}"
             return jsonify({"error": error_message}), 500


    except Exception as e:
        logging.error(f"Error calling Gemini API or processing history: {e}", exc_info=True)
        # Consider more specific error handling based on potential exceptions
        # from the google.generativeai library
        return jsonify({"error": "An error occurred while processing your request."}), 500

# --- Health Check Endpoint (Optional) ---
@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return jsonify({"status": "ok"}), 200

# --- Main Execution ---
if __name__ == '__main__':
    # Use a production-ready WSGI server like Gunicorn or Waitress instead of Flask's built-in server for deployment.
    # Example: gunicorn -w 4 -b 0.0.0.0:5000 app:app
    # For development:
    app.run(debug=True, host='0.0.0.0', port=5001) # Use a port like 5001
