Qualtrics.SurveyEngine.addOnload(function() {
    // Get the Next Button element (adjust if using a custom button)
    var nextButton = this.getControlContainer().querySelector('#NextButton');
    if (!nextButton) {
        console.error("Could not find the Next Button.");
        return; // Exit if the button isn't found
    }

    // Get the text input element for the current question
    var textInput = document.getElementById('QR~' + this.questionId);
     if (!textInput) {
        console.error("Could not find the text input element for question " + this.questionId);
        return; // Exit if the input isn't found
    }

    // Disable the Next button initially if needed (optional)
    // nextButton.disabled = true;

    // Function to call the backend API
    function callGeminiApi(promptText) {
        // IMPORTANT: Replace with the ACTUAL URL of your deployed backend service
        var backendUrl = 'YOUR_DEPLOYED_BACKEND_URL/generate';

        console.log("Sending prompt to backend:", promptText);

        // Disable button during API call
        nextButton.disabled = true;
        nextButton.value = 'Processing...'; // Change button text

        fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: promptText }) // Send prompt in JSON body
        })
        .then(response => {
             if (!response.ok) {
                // Try to get error message from backend response body
                 return response.json().then(errData => {
                    // Throw an error that includes the backend's message if available
                    throw new Error(`Network response was not ok: ${response.statusText}. Backend Error: ${errData.error || 'Unknown error'}`);
                 }).catch(() => {
                     // If parsing the error JSON fails, throw a generic error
                     throw new Error(`Network response was not ok: ${response.statusText}. Could not parse error response.`);
                 });
             }
             return response.json(); // Parse the JSON response body
        })
        .then(data => {
            console.log("Received response from backend:", data);
            if (data && data.generated_text) {
                // Store the response in the Embedded Data field
                Qualtrics.SurveyEngine.setEmbeddedData('geminiResponse', data.generated_text);
                console.log("Stored Gemini response in Embedded Data.");
                 // Optional: Display the response to the user in the survey page
                // var responseDiv = document.getElementById('geminiResponseDisplay');
                // if(responseDiv) { responseDiv.innerText = data.generated_text; }

            } else {
                 // Handle cases where the backend might return success but no text (or an error structure)
                 var errorMessage = data.error || "Received unexpected response structure from backend.";
                 console.error("Backend response error:", errorMessage);
                 Qualtrics.SurveyEngine.setEmbeddedData('geminiResponse', 'Error: ' + errorMessage);
                 // Optional: Display error to user
                 // var responseDiv = document.getElementById('geminiResponseDisplay');
                 // if(responseDiv) { responseDiv.innerText = 'Error receiving response.'; }
            }
        })
        .catch(error => {
            console.error('Error calling backend API:', error);
            // Store error message in Embedded Data
            Qualtrics.SurveyEngine.setEmbeddedData('geminiResponse', 'Error: Failed to communicate with backend. ' + error.message);
             // Optional: Display error to user
            // var responseDiv = document.getElementById('geminiResponseDisplay');
            // if(responseDiv) { responseDiv.innerText = 'Error: Could not get response.'; }

        })
        .finally(() => {
            // Re-enable the Next button and reset text, regardless of success or failure
            nextButton.disabled = false;
            nextButton.value = 'Next >>'; // Or your original button text
            // Automatically click the next button to proceed *after* API call finishes
            // Be careful with this - ensure the user expects this behavior.
            // Qualtrics.SurveyEngine.clickNextButton();
            console.log("API call finished. Button re-enabled.");
        });
    }

    // Add click event listener to the Next button
    nextButton.onclick = (event) => {
         // Prevent the default Qualtrics navigation temporarily
        event.preventDefault();

        // Get the text from the input field
        var userInputText = textInput.value.trim();

        if (userInputText) {
            // Store the user input in the Embedded Data field
            Qualtrics.SurveyEngine.setEmbeddedData('userInput', userInputText);
            console.log("Stored user input in Embedded Data.");

            // Call the backend API
            callGeminiApi(userInputText);

             // IMPORTANT: The actual page progression happens in the .finally() block
             // *after* the API call is complete OR by manually calling clickNextButton().
             // Remove the default navigation behavior here and control it in finally().
              // Instead of immediately clicking next, let the finally() block handle it, or require a second click.
             // Qualtrics.SurveyEngine.clickNextButton(); // Don't click here if you wait in finally()

        } else {
            // Handle empty input if necessary (e.g., show a message)
            console.warn("User input is empty.");
             // If you allow empty input to proceed without API call:
             Qualtrics.SurveyEngine.setEmbeddedData('userInput', '');
             Qualtrics.SurveyEngine.setEmbeddedData('geminiResponse', ''); // Clear response field
             Qualtrics.SurveyEngine.clickNextButton(); // Allow moving on if input is empty
        }
    };

    // Optional: Add a placeholder div in your question text to display the response
    // In the question HTML view: <div id="geminiResponseDisplay"></div>
});
