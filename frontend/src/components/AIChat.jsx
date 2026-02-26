import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Code2 } from 'lucide-react'
import './AIChat.css'

function AIChat({ data }) {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hi! I'm your AI assistant for understanding ${data?.repoName || 'this codebase'}. I've analyzed the entire repository and can help answer questions about its architecture, components, and implementation details. What would you like to know?`
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsTyping(true)

        // Simulate AI response (in real implementation, this would call AWS Bedrock)
        setTimeout(() => {
            const aiResponse = generateAIResponse(input, data)
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
            setIsTyping(false)
        }, 1500)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const suggestedQuestions = [
        'How does authentication work in this codebase?',
        'What is the overall architecture pattern?',
        'Explain the data flow in this application',
        'What are the main dependencies?'
    ]

    return (
        <div className="ai-chat">
            <div className="chat-container card">
                <div className="chat-header">
                    <div className="header-info">
                        <div className="ai-avatar">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h4>AI Code Assistant</h4>
                            <p className="text-muted">Powered by AWS Bedrock</p>
                        </div>
                    </div>
                    <div className="status-indicator">
                        <span className="status-dot"></span>
                        <span className="text-muted">Online</span>
                    </div>
                </div>

                <div className="chat-messages">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`message ${message.role} animate-fade-in`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="message-avatar">
                                {message.role === 'assistant' ? (
                                    <div className="avatar assistant">
                                        <Bot size={18} />
                                    </div>
                                ) : (
                                    <div className="avatar user">
                                        <User size={18} />
                                    </div>
                                )}
                            </div>
                            <div className="message-content">
                                <div className="message-bubble">
                                    {message.content}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="message assistant animate-fade-in">
                            <div className="message-avatar">
                                <div className="avatar assistant">
                                    <Bot size={18} />
                                </div>
                            </div>
                            <div className="message-content">
                                <div className="message-bubble typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions */}
                {messages.length <= 1 && (
                    <div className="suggested-questions">
                        <p className="text-muted">Try asking:</p>
                        <div className="questions-grid">
                            {suggestedQuestions.map((question, index) => (
                                <button
                                    key={index}
                                    className="suggestion-chip"
                                    onClick={() => setInput(question)}
                                >
                                    <Sparkles size={14} />
                                    {question}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="chat-input-container">
                    <div className="input-wrapper">
                        <textarea
                            className="chat-input"
                            placeholder="Ask anything about the codebase..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            rows={1}
                        />
                        <button
                            className="btn btn-primary send-btn"
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="input-hint text-muted">
                        <Code2 size={12} />
                        Context-aware responses based on analyzed codebase
                    </p>
                </div>
            </div>
        </div>
    )
}

// Mock AI response generator for prototype
function generateAIResponse(question, data) {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes('authentication') || lowerQuestion.includes('auth')) {
        return `Based on my analysis of ${data?.repoName || 'the codebase'}, authentication is implemented using JWT (JSON Web Tokens). Here's how it works:\n\n1. Users log in through the auth API endpoint\n2. The server validates credentials and returns a JWT token\n3. The token is stored in localStorage (see src/utils/auth.js)\n4. An Axios interceptor automatically adds the token to all API requests\n5. The backend validates the token on each protected route\n\nThis is a standard and secure pattern for modern web applications.`
    }

    if (lowerQuestion.includes('architecture') || lowerQuestion.includes('pattern')) {
        return `This codebase follows a **component-based architecture** pattern with clear separation of concerns:\n\n🏗️ **Architecture Layers:**\n- **Presentation Layer**: React components for UI\n- **State Management**: React hooks + Context API\n- **API Layer**: Axios-based service layer for backend communication\n- **Routing**: React Router for navigation\n\nThe architecture promotes modularity, testability, and maintainability. Components are organized by feature, making it easy to locate and modify specific functionality.`
    }

    if (lowerQuestion.includes('data flow') || lowerQuestion.includes('flow')) {
        return `Here's how data flows through the application:\n\n1️⃣ **User Action**: User interacts with a React component\n2️⃣ **Event Handler**: Component calls a function (e.g., form submission)\n3️⃣ **API Service**: The service layer makes an HTTP request via Axios\n4️⃣ **Backend Processing**: Server processes the request and queries database\n5️⃣ **Response**: Data returns through the API layer\n6️⃣ **State Update**: React state is updated, triggering re-render\n7️⃣ **UI Update**: Component displays new data\n\nThis unidirectional data flow makes the application predictable and easier to debug.`
    }

    if (lowerQuestion.includes('dependencies') || lowerQuestion.includes('libraries')) {
        return `The main dependencies in this project are:\n\n📦 **Core:**\n- React (v18+) - UI framework\n- React Router - Client-side routing\n\n🔧 **Utilities:**\n- Axios - HTTP client\n- lodash - Utility functions\n\n🎨 **UI/Styling:**\n- CSS Modules / Styled Components\n\nAll dependencies are modern, well-maintained, and widely used in production applications.`
    }

    // Default response
    return `Great question! Based on my analysis of the codebase, I can see that ${data?.repoName || 'this project'} has ${data?.structure?.files || 0} files and ${data?.structure?.components || 0} components.\n\nThe code follows modern best practices with:\n- Clear component structure\n- Proper separation of concerns\n- Consistent coding patterns\n\nWould you like me to dive deeper into any specific aspect? I can explain components, data flow, patterns, or any part of the code.`
}

export default AIChat
