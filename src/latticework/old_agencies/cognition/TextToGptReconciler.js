// Initialize the chat history
let chatHistory = [];

/**
 * Initializes the chat history.
 * Resets the conversation history to start fresh.
 */
export const initializeChat = () => {
  // Reset the chat history
  chatHistory = [];
};

/**
 * Processes user input by sending it to your backend service.
 * @param {string} apiKey - The OpenAI API key (not used in this implementation but kept to match the method signature).
 * @param {string} userInput - The user's response.
 * @returns {Promise<string>} - The assistant's response.
 */
export const processTextWithGPT = async (apiKey, userInput) => {
  // Add user input to chat history
  chatHistory.push({ role: 'user', content: userInput });

  try {
    // Prepare the payload for the backend service, including the full chat history
    const payload = {
      conversation: chatHistory,
    };

    // Send the POST request to your backend service
    const response = await fetch('https://server-vercel-function-eevapp.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.reply) {
      throw new Error(`Backend service error: ${response.status} - ${data.error || 'Unknown error'}`);
    }

    // Capture the assistant's response
    const assistantMessage = data.reply.trim();

    // Add the assistant's response to chat history
    chatHistory.push({ role: 'assistant', content: assistantMessage });

    return assistantMessage;
  } catch (error) {
    console.error('Error processing response from backend service:', error);
    throw error;
  }
};