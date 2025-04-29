import os
import google.generativeai as genai
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
allowed_origins = ["https://emlyonbs.eu.qualtrics.com"]

# Apply CORS to your app, specifying allowed origins
CORS(app, resources={r"/generate": {"origins": allowed_origins}})
# This applies CORS specifically to the /generate route for the specified origins.
# For simpler (but less secure) setup during development, you could use:
# CORS(app) # Allows all origins - NOT recommended for production
# --------------------------

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
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")
try:
    # Initialize the generative model
    # Add safety_settings and generation_config as needed
    model = genai.GenerativeModel(MODEL_NAME)
    logging.info(f"Successfully initialized GenerativeModel with {MODEL_NAME}")
except Exception as e:
    logging.error(f"Failed to initialize GenerativeModel ({MODEL_NAME}): {e}")
    model = None # Ensure model is None if initialization fails

# --- API Endpoint ---
@app.route('/generate', methods=['POST', 'OPTIONS'])
def generate_text():
    """
    Handles POST requests to generate text via Gemini API
    and handles preflight OPTIONS requests for CORS.
    """
    # --- Handle OPTIONS request explicitly ---
    if request.method == 'OPTIONS':
        # Flask-Cors adds the Access-Control headers.
        # We just need to return a successful response.
        # 204 No Content is appropriate for successful preflight.
        return '', 204
    # -----------------------------------------

    # --- Handle POST request ---
    elif request.method == 'POST':
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
        user_prompt = data.get('prompt')

        if not user_prompt:
            logging.warning("Missing 'prompt' in request data")
            return jsonify({"error": "Missing 'prompt' in request data"}), 400

        if not isinstance(user_prompt, str):
            logging.warning("Invalid 'prompt' type in request data")
            return jsonify({"error": "'prompt' must be a string"}), 400

        logging.info(f"Received prompt: {user_prompt[:50]}...") # Log snippet

        # --- Gemini API Call ---
        try:
            logging.info(f"Sending request to Gemini model: {MODEL_NAME}")
            # For simple text-in, text-out, use generate_content
            response = model.generate_content(user_prompt)
            # Consider adding generation_config for temperature, max_output_tokens etc.
            # response = model.generate_content(user_prompt, generation_config=genai.types.GenerationConfig(...))

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
            logging.error(f"Error calling Gemini API: {e}", exc_info=True)
            # Consider more specific error handling based on potential exceptions
            # from the google.generativeai library
            return jsonify({"error": "An error occurred while processing your request."}), 500
    # else:
        # If you weren't using Flask-Cors's automatic OPTIONS handling,
        # you would return appropriate headers here for OPTIONS requests.
        # return '', 204 # Example for manual OPTIONS handling

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
