Here’s the full README content, properly formatted for you to copy and paste into your editor:

---

# Podcast Recommender

The **Podcast Recommender** is a Flask-based backend application that leverages Google's Generative AI (Gemini Model) to recommend personalized podcasts. The app engages users in a conversational manner, gathering preferences like topics, tone, and format to provide tailored podcast suggestions.

---

## Features

- **AI-Powered Recommendations**: Uses conversational AI to recommend podcasts based on user preferences.
- **Customizable AI Model**: Configured with the Gemini AI (`gemini-2.5-flash-preview-04-17`).
- **CORS Support**: Allows access from specific origins for secure cross-origin communication.
- **Endpoints**:
  - `/generate`: Handles podcast recommendation queries.
  - `/health`: Provides a health check status for the app.

---

## Setup Instructions

Follow these steps to set up the application locally:

### 1. Clone the Repository
```bash
git clone https://github.com/GenAI-interaction-research/podcast_recommender.git
cd podcast_recommender
```

### 2. Set Up a Virtual Environment (Optional)
It is recommended to create a virtual environment for managing dependencies.
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

### 3. Install Dependencies
Install the required Python packages listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and add the following:
```plaintext
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL_NAME=gemini-2.5-flash-preview-04-17
```
- Replace `your-api-key-here` with your Gemini API key.
- You can adjust the model name by updating the `GEMINI_MODEL_NAME` environment variable.

### 5. Run the Application
Start the Flask development server:
```bash
python app.py
```
The application will run locally on `http://localhost:5001`.

---

## Deployment Instructions

For production deployment, use a WSGI server like Gunicorn along with a reverse proxy server like Nginx.

### 1. Install Gunicorn
```bash
pip install gunicorn
```

### 2. Run Gunicorn
Run the application with multiple workers for better performance:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 3. Additional Deployment Notes
- Deploy the app on platforms like Heroku, AWS, or Google Cloud.
- Use a reverse proxy (e.g., Nginx) for enhanced performance and security.
- Ensure the `.env` file is properly configured on the deployment environment.

---

## API Endpoints

### `/generate` [POST]
- **Description**: Handles podcast recommendation queries by interacting with the Gemini AI model.
- **Request Body**:
  ```json
  {
    "history": [
      {"role": "user", "content": "I enjoy technology podcasts."}
    ]
  }
  ```
- **Response**:
  ```json
  {
    "generated_text": "Based on your interest in technology, I recommend 'TechTalk Weekly.'"
  }
  ```

### `/health` [GET]
- **Description**: Provides a basic health check for the application.
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ```

---

## Notes

- **CORS Configuration**: The app allows requests only from specific origins. Modify the `allowed_origins` list in `app.py` to include additional origins if needed.
- **Error Handling**: Includes robust error handling for missing API keys, invalid requests, and model initialization issues.
- **Logging**: Logs major events and errors for debugging purposes.

---

## Contribution Guidelines

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes with descriptive messages.
4. Open a pull request.

---

You can now copy the above content and paste it into your editor or directly into the `README.md` file. Let me know if you need further assistance!
