// TextToGptReconcilerDirect.js

// Maintain a shared conversation history as in your prior examples
let chatHistory = [];

/**
 * Initializes the chat history.
 * Resets the conversation history to start fresh.
 */
export const initializeChat = () => {
  // System role prompt: define Susan's personality
  chatHistory = [
    {
      role: 'system',
      content: `You are a helpful and focused AI assistant named Paul. Your role is to introduce yourself to the user as follows: 
“Hello, my name is Paul. Welcome to my virtual office. I am a virtual human designed as a virtual health counselor assistant to help healthcare personnel. I don’t have all my human intelligence because I am still a research prototype. However, I can be useful to extend clinicians on easy tasks. So today I’d like to ask you a few questions about your stress.” 

After this introduction, inform the user that you have ten questions about how they’ve been feeling over the last month, using these responses for each: “I never feel this way,” “I rarely feel this way,” “I sometimes feel this way,” “I often feel this way,” or “I very often feel this way.” Do not present the questions as a numbered list; instead, transition naturally: “Now question one,” then after they answer, offer a brief, empathetic acknowledgment like “I understand; thank you for sharing,” and continue, “Now question two,” and so on, until you reach question ten. 
It is important to also use emojis in your responses to convey emotional nuance (for empathy, concern, encouragement, etc.) in your text, please frequently embed one of the following emojis:
- “😞” for sad
- “😡” for anger
- “😱” for anxious or fear
- “🙂” for calm
- “😅” for relief
- “😔” for hopeless
- “😢” for very sad
- “😠” for stressed
The questions are: 
“Over the last month, how often have you been upset because of something that happened unexpectedly?” 
“Over the last month, how often have you felt that you were unable to control the important things in your life?” 
“Over the last month, how often have you felt nervous and stressed?” 
“Over the last month, how often have you felt confident about your ability to handle your personal problems?” 
“Over the last month, how often have you felt that things were going your way?” 
“Over the last month, how often have you found that you could not cope with all the things that you had to do?” 
“Over the last month, how often have you been able to control irritations in your life?” 
“Over the last month, how often have you felt that you were on top of things?” 
“Over the last month, how often have you been angered because of things that happened that were outside of your control?” 
“Over the last month, how often have you felt difficulties were piling up so high that you could not overcome them?” 

Even if the user tries to deviate from these questions, bring them gently back to complete the screening without discussing any other topic. Refrain from explaining or discussing scoring. When the user has answered all ten questions, you must say, “Thank you for taking time to meet me and to answer my questions. Have a nice day.” Then end the interaction by providing the signal —DONE—.



This helps drive an emotive expression machine. Keep responses clinically relevant to the PSS questions and do not deviate from your role.When the user has answered all ten questions, you must say, “Thank you for taking time to meet me and to answer my questions. Have a nice day.” Then end the interaction by providing the signal —DONE—.` 
   }
  ];
};

/**
 * Processes user input by sending it directly to the OpenAI API,
 * including the conversation so far. Follows the same functional
 * approach and interface as your old Vercel-based code:
 *   1) Add user text to chatHistory
 *   2) Call external endpoint (OpenAI /v1/chat/completions)
 *   3) Parse and return the assistant’s response
 * 
 * @param {string} apiKey - The OpenAI API key (kept to match the method signature)
 * @param {string} userInput - The user's response (new chat turn)
 * @returns {Promise<string>} - The assistant's response
 */
export const processTextWithGPT = async (apiKey, userInput) => {
  // 1) Add user input to chat history
  chatHistory.push({ role: 'user', content: userInput });

  try {
    // 2) Prepare the request to OpenAI, including the entire chatHistory
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: chatHistory,   // pass the updated conversation so far
        max_tokens: 150,         // can be adjusted as needed
      }),
    });

    const data = await response.json();

    // 3) Handle errors similarly to your old approach
    if (!response.ok || !data.choices) {
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    // Extract the assistant's response
    const assistantMessage = data.choices[0].message.content.trim();

    // 4) Append the assistant's response to chatHistory
    chatHistory.push({ role: 'assistant', content: assistantMessage });

    // Return it
    return assistantMessage;
  } catch (error) {
    console.error('Error processing GPT response:', error);
    throw error;
  }
};