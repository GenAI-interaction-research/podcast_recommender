Qualtrics.SurveyEngine.addOnload(function() {

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

        // Store User Input
        Qualtrics.SurveyEngine.setEmbeddedData('userInput', promptText);
        console.log("Stored user input in Embedded Data: ", promptText);

        // Prepare for API Call
        customButton.disabled = true;
        customButton.innerText = 'Processing...';
        responseArea.innerText = 'Generating response...';
        responseArea.style.color = 'black';

        // Backend API Call
        const backendUrl = 'https://app-paper-b89084cfd921.herokuapp.com/generate'; // Your deployed URL

        fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText })
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
                responseArea.innerText = generatedText;
                Qualtrics.SurveyEngine.setEmbeddedData('geminiResponse', generatedText);
                console.log("Stored Gemini response in Embedded Data.");
            } else {
                 const errorMessage = data.error || "Received unexpected response structure from backend.";
                 console.error("Backend response error:", errorMessage);
                 responseArea.innerText = 'Error: ' + errorMessage;
                 responseArea.style.color = 'red';
                 Qualtrics.SurveyEngine.setEmbeddedData('geminiResponse', 'Error: ' + errorMessage);
            }
        })
        .catch(error => {
            console.error('Error calling backend API:', error);
            responseArea.innerText = 'Error: Could not communicate with the generation service. ' + error.message;
            responseArea.style.color = 'red';
            Qualtrics.SurveyEngine.setEmbeddedData('geminiResponse', 'Error: Failed fetch. ' + error.message);
        })
        .finally(() => {
            customButton.disabled = false;
            customButton.innerText = 'Generate Response';
            console.log("API call finished.");
        });

    }; // End of customButton.onclick

    // Note: We are NOT interfering with the standard Qualtrics Next button here.

}); // End of addOnload
