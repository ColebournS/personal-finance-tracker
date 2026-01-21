import React, { useState, useEffect } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import { callAgent } from '../utils/agentService';
import { createAgentTools } from '../utils/agentTools';
import { useData } from '../DataContext';
import supabase from '../supabaseClient';
import ReactMarkdown from 'react-markdown';

const CHAT_STORAGE_KEY = 'ai_assistant_chat_history';

const AIAssistant = () => {
  const { income, budgetGroups, purchases, userId } = useData();
  
  // Get accounts data - need to fetch separately since it's not in DataContext
  const [accounts, setAccounts] = useState([]);
  
  // Load chat history from localStorage on mount
  const [messages, setMessages] = useState(() => {
    try {
      const savedChat = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedChat) {
        const parsedChat = JSON.parse(savedChat);
        return parsedChat.length > 0 ? parsedChat : [{
          id: 1,
          type: 'bot',
          content: 'Hello! I\'m your AI financial agent. I have access to tools that can analyze your financial data, including income, budgets, accounts, and spending patterns. I can choose what information to fetch based on your questions. How can I help you today?'
        }];
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    
    return [{
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI financial agent. I have access to tools that can analyze your financial data, including income, budgets, accounts, and spending patterns. I can choose what information to fetch based on your questions. How can I help you today?'
    }];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [messages]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await supabase
          .from("accounts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        
        setAccounts(data || []);
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };
    
    if (userId) {
      fetchAccounts();
    }
  }, [userId]);
  
  const { tools, executeTool } = createAgentTools(income, budgetGroups, purchases, userId, accounts);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await callAgent(input.trim(), messages, tools, executeTool);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: aiResponse
      };
      
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again.'
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const initialMessage = {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your AI financial agent. I have access to tools that can analyze your financial data, including income, budgets, accounts, and spending patterns. I can choose what information to fetch based on your questions. How can I help you today?'
    };
    
    setMessages([initialMessage]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-black">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'bot' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              {message.type === 'bot' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                      h2: ({children}) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                      p: ({children}) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-sm">{children}</li>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                      em: ({children}) => <em className="italic">{children}</em>,
                      code: ({children}) => <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">{children}</code>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic">{children}</blockquote>
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
            </div>
            {message.type === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your finances... I'll use tools to get the data I need."
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 w-12 h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
          >
            <Send size={20} className="text-white" />
          </button>
          <button
            onClick={clearChat}
            disabled={isLoading}
            className="flex-shrink-0 w-12 h-12 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
            title="Clear chat history"
          >
            <Trash2 size={20} className="text-white" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          AI Finance Agent
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
