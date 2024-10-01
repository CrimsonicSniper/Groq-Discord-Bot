const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
async function getGroqChatCompletion(context) {
    try {
      const filteredContext = context.filter(message => message.content && message.content.trim() !== '');
  
      const response = await groq.chat.completions.create({
        messages: filteredContext,
        model: 'llava-v1.5-7b-4096-preview',
      });
  
      return response.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (error) {
      console.error("Groq API Error:", error);
      return "Sorry, I couldn't process your request.";
    }
  }
  async function getGroqChatCompletionContinous(context) {
    try {
      const filteredContext = context.filter(message => message.content && message.content.trim() !== '');
  
      const response = await groq.chat.completions.create({
        messages: filteredContext,
        model: 'llama3-8b-8192',
      });
  
      return response.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (error) {
      console.error("Groq API Error:", error);
      return "Sorry, I couldn't process your request.";
    }
  }
  module.exports = { getGroqChatCompletion, getGroqChatCompletionContinous };