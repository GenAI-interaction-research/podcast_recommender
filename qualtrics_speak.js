Qualtrics.SurveyEngine.addOnload(function() {

    // --- Initialize Conversation History (Still needed for backend context) ---
    let conversationHistory = [];
    // --- Speech Recognition Variables ---
    let recognition = null;
    let finalRecognizedText = '';
    let isRecording = false;

    // --- Get the container for the current question ---
    const questionContainer = this.questionContainer;
    const questionId = this.questionId;

    // --- Define CSS Styles ---
    const styles = `
        #speakContainer-${questionId} { /* Renamed main container */
            padding: 10px;
            max-width: 600px;
            margin: 0 auto;
            font-family: sans-serif;
        }
        /* Removed chatDisplayArea and chat-message styles */
        #speechControlArea-${questionId} {
            display: flex;
            justify-content: space-around;
            align-items: center;
            margin-top: 10px;
            padding: 10px 5px; /* Added padding */
            border: 1px solid #ccc; /* Add border like input area */
            border-radius: 5px;
            margin-bottom: 15px; /* Space before response area */
        }
        #speechControlArea-${questionId} button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
        }
        #startButton-${questionId} { background-color: #28a745; color: white; }
        #stopButton-${questionId} { background-color: #dc3545; color: white; }
        #submitButton-${questionId} { background-color: #007bff; color: white; }

        #speechControlArea-${questionId} button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
            opacity: 0.6;
        }
        #statusArea-${questionId} {
            font-size: 0.9em;
            color: #666;
            min-height: 1.2em;
            margin-top: -10px; /* Pull closer to buttons */
            margin-bottom: 10px; /* Space before response area */
            text-align: center;
        }
        #latestResponseArea-${questionId} { /* New area for the latest response */
            margin-top: 15px;
            padding: 15px; /* More padding */
            border: 1px solid #ccc;
            border-radius: 5px; /* Rounded corners */
            min-height: 70px; /* Increased min height */
            background-color: #f9f9f9;
            line-height: 1.5; /* Improve readability */
            word-wrap: break-word; /* Ensure long words wrap */
        }
    `;

    // --- Dynamically Create HTML Elements ---

    // Inject CSS
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Main Container
    const speakContainer = document.createElement('div');
    speakContainer.id = `speakContainer-${questionId}`;

    // --- Create elements in the desired order ---

    // 1. Speech Control Area (Buttons)
    const speechControlArea = document.createElement('div');
    speechControlArea.id = `speechControlArea-${questionId}`;

    const startButton = document.createElement('button');
    startButton.id = `startButton-${questionId}`;
    startButton.type = 'button';
    startButton.innerText = 'Start Recording';
    speechControlArea.appendChild(startButton);

    const stopButton = document.createElement('button');
    stopButton.id = `stopButton-${questionId}`;
    stopButton.type = 'button';
    stopButton.innerText = 'Stop Recording';
    stopButton.disabled = true;
    speechControlArea.appendChild(stopButton);

    const submitButton = document.createElement('button');
    submitButton.id = `submitButton-${questionId}`;
    submitButton.type = 'button';
    submitButton.innerText = 'Submit';
    submitButton.disabled = true;
    speechControlArea.appendChild(submitButton);

    speakContainer.appendChild(speechControlArea); // Add controls first

    // 2. Status Area (Below buttons)
    const statusArea = document.createElement('div');
    statusArea.id = `statusArea-${questionId}`;
    statusArea.innerText = 'Click "Start Recording" to speak.';
    speakContainer.appendChild(statusArea);

    // 3. Latest Response Display Area (Below status)
    const latestResponseArea = document.createElement('div');
    latestResponseArea.id = `latestResponseArea-${questionId}`;
    latestResponseArea.innerText = '<!-- AI response will appear here -->'; // Placeholder
    speakContainer.appendChild(latestResponseArea);


    // --- Append main container to the question container ---
    questionContainer.appendChild(speakContainer);

    // --- Function to Process User Input (Called by Submit) ---
    function processUserInput(textToSubmit) {
        if (!textToSubmit) {
            statusArea.innerText = 'Nothing to submit.';
            submitButton.disabled = true;
            return;
        }

        statusArea.innerText = 'Processing submission...';
        latestResponseArea.innerText = 'Generating response...'; // Update response area status

        // Add User Message to History (still needed for context)
        const userMessage = { role: 'user', parts: [{ text: textToSubmit }] };
        conversationHistory.push(userMessage);
        // DO NOT display user message in the UI anymore
        // appendMessage('user', textToSubmit);
        console.log("User message added to history:", userMessage);
        console.log("Current History:", conversationHistory);

        // Store submitted text and full history in Qualtrics
        Qualtrics.SurveyEngine.setEmbeddedData('lastUserInput', textToSubmit);
        Qualtrics.SurveyEngine.setEmbeddedData('fullConversationHistory', JSON.stringify(conversationHistory));

        // Clear recognized text variable and disable/reset buttons for processing
        finalRecognizedText = '';
        submitButton.disabled = true;
        startButton.disabled = true;
        stopButton.disabled = true;

        // Prepare for API Call (Status already set)
        // statusArea.innerText = 'Waiting for AI response...';

        // Backend API Call
        const backendUrl = 'https://app-paper-b89084cfd921.herokuapp.com/generate';

        fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                     throw new Error(`Network error: ${response.statusText}. Backend: ${errData.error || 'Unknown error'}`);
                }).catch(() => {
                     throw new Error(`Network error: ${response.statusText}. Could not parse error response.`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Received response from backend:", data);
            if (data && data.generated_text) {
                const generatedText = data.generated_text;
                const modelMessage = { role: 'model', parts: [{ text: generatedText }] };
                conversationHistory.push(modelMessage); // Add to history for context
                // --- Display response in the dedicated area ---
                latestResponseArea.innerText = generatedText;
                Qualtrics.SurveyEngine.setEmbeddedData('lastGeminiResponse', generatedText);
                Qualtrics.SurveyEngine.setEmbeddedData('fullConversationHistory', JSON.stringify(conversationHistory));
                // Status updated in finally block
            } else {
                const errorMessage = data.error || "Received unexpected response structure.";
                console.error("Backend logic error:", errorMessage);
                statusArea.innerText = 'Error processing request.'; // Keep status concise
                latestResponseArea.innerText = 'Error: ' + errorMessage; // Show error in response area
                Qualtrics.SurveyEngine.setEmbeddedData('lastGeminiResponse', 'Error: ' + errorMessage);
            }
        })
        .catch(error => {
            console.error('Error during fetch:', error);
            statusArea.innerText = 'Error communicating with service.'; // Keep status concise
            latestResponseArea.innerText = 'Error: Could not communicate. ' + error.message; // Show error in response area
            Qualtrics.SurveyEngine.setEmbeddedData('lastGeminiResponse', 'Error: Fetch failed. ' + error.message);
        })
        .finally(() => {
            // Re-enable Start button after AI response or error
             startButton.disabled = false;
             stopButton.disabled = true;
             submitButton.disabled = true;
             if (!latestResponseArea.innerText.startsWith('Error:')) { // Check response area for errors
                 statusArea.innerText = 'Click "Start Recording" for next input.'; // Reset status if successful
             }
             console.log("API call finished.");
        });
    } // End of processUserInput function

    // --- Speech Recognition Setup (Logic remains the same, just status updates change slightly) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
            console.log('Speech recognition started (continuous).');
            isRecording = true;
            finalRecognizedText = '';
            statusArea.innerText = 'Listening... Click Stop when finished.';
            startButton.disabled = true;
            stopButton.disabled = false;
            submitButton.disabled = true;
            latestResponseArea.innerText = '<!-- AI response will appear here -->';
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscriptPart = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscriptPart += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscriptPart) {
                 finalRecognizedText += finalTranscriptPart + ' ';
                 console.log("Accumulated Final Text:", finalRecognizedText);
            }
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            let errorMsg = 'Error during recognition: ' + event.error;
            if (event.error === 'no-speech') {
                 errorMsg = 'No speech detected initially. Please try again.';
            } else if (event.error === 'audio-capture') {
                 errorMsg = 'Error: Microphone not found or not permitted.';
            } else if (event.error === 'not-allowed') {
                 errorMsg = 'Error: Microphone access denied.';
            } else if (event.error === 'network') {
                 errorMsg = 'Network error during speech recognition.';
            } else if (event.error === 'service-not-allowed') {
                 errorMsg = 'Speech service not allowed by browser/settings.';
            }
            statusArea.innerText = errorMsg;
            startButton.disabled = false;
            stopButton.disabled = true;
            submitButton.disabled = true;
            finalRecognizedText = '';
            latestResponseArea.innerText = '<!-- AI response will appear here -->';
        };

        recognition.onend = function() {
            console.log('Speech recognition service disconnected.');
            isRecording = false;

            if (stopButton.disabled === false) {
                 statusArea.innerText = 'Recognition stopped unexpectedly. Try again.';
                 startButton.disabled = false;
                 stopButton.disabled = true;
                 submitButton.disabled = true;
            } else {
                if (finalRecognizedText.trim()) {
                    statusArea.innerText = 'Recording stopped. Click Submit or Start again.';
                    submitButton.disabled = false;
                } else {
                    statusArea.innerText = 'Recording stopped. No text captured. Click Start Recording.';
                    submitButton.disabled = true;
                }
                startButton.disabled = false;
            }
        };

    } else {
        console.error('Web Speech API not supported in this browser.');
        statusArea.innerText = 'Speech recognition not supported by your browser.';
        startButton.disabled = true;
        stopButton.disabled = true;
        submitButton.disabled = true;
        latestResponseArea.innerText = 'Speech input unavailable in this browser.';
    }

    // --- Add Event Listeners for Buttons ---
    startButton.onclick = function() {
        if (recognition && !isRecording) {
            try {
                finalRecognizedText = '';
                recognition.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
                statusArea.innerText = "Could not start recording. Is microphone ready?";
                isRecording = false;
                startButton.disabled = false;
                stopButton.disabled = true;
                submitButton.disabled = true;
            }
        } else if (isRecording) {
            console.log("Already recording.");
        } else {
            statusArea.innerText = 'Speech recognition not available.';
        }
    };

    stopButton.onclick = function() {
        if (recognition && isRecording) {
            recognition.stop();
            isRecording = false;
            stopButton.disabled = true;
            startButton.disabled = false;
            statusArea.innerText = 'Stopping recording...';
            console.log("Manual stop requested.");
        } else {
             console.log("Stop clicked but not recording.");
             isRecording = false;
             startButton.disabled = false;
             stopButton.disabled = true;
             submitButton.disabled = !!finalRecognizedText.trim();
        }
    };

    submitButton.onclick = function() {
        processUserInput(finalRecognizedText.trim());
    };

    // --- Load Existing History ---
    // If you need to *display* previous state on page load, you'd need extra logic.
    // Currently, history is only loaded internally for context.
    // Let's clear the response area on load for consistency.
    latestResponseArea.innerText = '<!-- AI response will appear here -->';
    /*
    const savedHistory = Qualtrics.SurveyEngine.getEmbeddedData('fullConversationHistory');
    if (savedHistory) {
        try {
            conversationHistory = JSON.parse(savedHistory);
            // Decide if you want to show the *very last* AI response on load
            // if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length-1].role === 'model') {
            //    latestResponseArea.innerText = conversationHistory[conversationHistory.length-1].parts[0].text;
            // }
            console.log("Loaded previous conversation history (internal).");
        } catch (e) {
            console.error("Failed to parse saved history:", e);
            conversationHistory = [];
        }
    }
    */

}); // End of addOnload
