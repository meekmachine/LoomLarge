class GptAuditScreening {
    constructor(apiKey, questions) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('A valid OpenAI API key must be provided.');
        }
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.auditHistory = [];  // To store the conversation history
        this.currentQuestionIndex = 0;  // Track the current question index
        this.responses = [];  // Store responses for scoring
        this.questions = questions;  // Load questions from external file
        this.screeningStopped = false;  // Flag to stop screening early if needed
        this.initializeScreening();  // Set up the initial system prompt
    }

    /**
     * Sets up the AUDIT screening environment with a controlled prompt.
     */
    initializeScreening() {
        this.auditHistory = [
            {
                role: 'system',
                content: "You are a professional assistant conducting the Alcohol Use Disorders Identification Test (AUDIT) screening. Maintain a professional, helpful demeanor, and stop the screening if the user doesn't need it."
            },
        ];
    }

    /**
     * Processes the user's response to the current AUDIT question.
     * @param {string} userResponse - The user's response to the question.
     * @returns {Promise<object>} - Contains the next question or results if the screening is complete.
     */
    async processResponse(userResponse) {
        // Store the user's response
        const currentQuestion = this.questions[this.currentQuestionIndex];
        this.responses.push({ question: currentQuestion.text, response: userResponse });

        // Check if the screening should stop based on early responses
        if (this.shouldStopScreening()) {
            this.screeningStopped = true;
            return { type: 'results', results: { message: "Screening ended based on your responses. Thank you for your time." }};
        }

        // Move to the next question
        this.currentQuestionIndex++;

        // If the screening is complete, calculate results and return
        if (this.isComplete()) {
            const results = this.getResults();
            return { type: 'results', results };
        }

        // Otherwise, get the next question
        const nextQuestion = this.getCurrentQuestion();
        this.auditHistory.push({ role: 'user', content: userResponse });

        return await this.sendNextQuestion(nextQuestion);
    }

    /**
     * Logic to determine if the screening should stop based on responses.
     */
    shouldStopScreening() {
        const firstResponse = this.responses[0]?.response?.toLowerCase();
        if (firstResponse === 'never') {
            // Stop screening if user has no drinking history (customizable logic)
            return true;
        }
        return false;
    }

    /**
     * Checks if all AUDIT questions have been asked.
     * @returns {boolean} - True if the screening is complete, otherwise false.
     */
    isComplete() {
        return this.currentQuestionIndex >= this.questions.length || this.screeningStopped;
    }

    // Additional methods for sending the next question, calculating results, etc.
    // ...
}