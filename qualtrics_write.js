Qualtrics.SurveyEngine.addOnload(function() {

    // --- Initialize Conversation History ---
    let conversationHistory = []; // Stores messages { role: 'user'/'model', parts: [text] }

    // --- Get the container for the current question ---
    const questionContainer = this.questionContainer;

    // --- Dynamically Create HTML Elements ---

    // Create main container for input elements
    const inputContainer = document.createElement('div');

    // Create Label
    const label = document.createElement('label');
    label.htmlFor = 'customTextInput'; // Use htmlFor for accessibility
    label.innerText = 'Enter your prompt:';
    inputContainer.appendChild(label);
    inputContainer.appendChild(document.createElement('br')); // Line break

    // Create Text Area
    const customInput = document.createElement('textarea');
    customInput.id = 'customTextInput';
    customInput.rows = 4;
    customInput.style.width = '90%';
    customInput.style.marginBottom = '10px';
    inputContainer.appendChild(customInput);
    inputContainer.appendChild(document.createElement('br')); // Line break

    // Create Button
    const customButton = document.createElement('button');
    customButton.id = 'customSubmitButton';
    customButton.type = 'button';
    customButton.innerText = 'Generate Response';
    inputContainer.appendChild(customButton);

    // Create Response Display Area
    const responseArea = document.createElement('div');
    responseArea.id = 'responseDisplayArea';
    responseArea.style.marginTop = '15px';
    responseArea.style.padding = '10px';
    responseArea.style.border = '1px solid #ccc';
    responseArea.style.minHeight = '50px';
    responseArea.style.backgroundColor = '#f9f9f9';
    responseArea.innerText = '<!-- Response will appear here -->'; // Placeholder text

    // --- Append created elements to the question container ---
    // Add input container first
    questionContainer.appendChild(inputContainer);
    // Add response area after the input container
    questionContainer.appendChild(responseArea);

    // --- Now that elements are created, add the button click listener ---
    customButton.onclick = function() {
        const promptText = customInput.value.trim();

        // Basic Input Validation
        if (!promptText) {
            responseArea.innerText = 'Please enter some text before submitting.';
            responseArea.style.color = 'red';
            return;
        }

        // --- Store *current* input & Add to History ---
        Qualtrics.SurveyEngine.setEmbeddedData('lastUserInput', promptText); // Store just the latest input if needed
        const userMessage = { role: 'user', parts: [promptText] };
        conversationHistory.push(userMessage);
        console.log("Added user message to history:", userMessage);
        console.log("Current History:", conversationHistory);

        // --- Clear input field after adding to history ---
        customInput.value = ''; // Clear the textarea

        // --- Prepare for API Call ---
        customButton.disabled = true;
        customButton.innerText = 'Processing...';
        responseArea.innerText = 'Generating response...';
        responseArea.style.color = 'black';

        // --- Backend API Call (Sending Full History) ---
        const backendUrl = '[ADD YOUR URL OF THE HOSTED APP HERE]';

        fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // --- Send the entire history ---
            body: JSON.stringify({ history: conversationHistory })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                     throw new Error(`Network response error: ${response.statusText}. Backend message: ${errData.error || 'Unknown error'}`);
                }).catch(() => {
                     throw new Error(`Network response error: ${response.statusText}. Could not parse error response.`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Received response from backend:", data);
            if (data && data.generated_text) {
                const generatedText = data.generated_text;
                // --- Display & Store Response ---
                responseArea.innerText = generatedText;
                Qualtrics.SurveyEngine.setEmbeddedData('lastGeminiResponse', generatedText); // Store just latest response

                // --- Add Model Response to History ---
                const modelMessage = { role: 'model', parts: [generatedText] };
                conversationHistory.push(modelMessage);
                console.log("Added model response to history:", modelMessage);
                console.log("Current History:", conversationHistory);

                // Optional: Store full history stringified if needed for data analysis
                Qualtrics.SurveyEngine.setEmbeddedData('fullConversationHistory', JSON.stringify(conversationHistory));

            } else {
                 // Handle backend errors returned in JSON
                 const errorMessage = data.error || "Received unexpected response structure from backend.";
                 console.error("Backend response error:", errorMessage);
                 responseArea.innerText = 'Error: ' + errorMessage;
                 responseArea.style.color = 'red';
                 Qualtrics.SurveyEngine.setEmbeddedData('lastGeminiResponse', 'Error: ' + errorMessage);
                 // Don't add backend error message to history as if it were a valid model response
            }
        })
        .catch(error => {
            // Handle network/fetch errors
            console.error('Error calling backend API:', error);
            responseArea.innerText = 'Error: Could not communicate with the generation service. ' + error.message;
            responseArea.style.color = 'red';
            Qualtrics.SurveyEngine.setEmbeddedData('lastGeminiResponse', 'Error: Failed fetch. ' + error.message);
        })
        .finally(() => {
            // --- Cleanup ---
            customButton.disabled = false;
            customButton.innerText = 'Generate Response';
            console.log("API call finished.");
        });

    }; // End of customButton.onclick

    // Note: We are NOT interfering with the standard Qualtrics Next button here.

}); // End of addOnload
