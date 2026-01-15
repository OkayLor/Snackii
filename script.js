// Webhook URL
const WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook/bc0df85b-ea80-4a3e-bf1a-e255b7723ccf';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const promptButtons = document.querySelectorAll('.prompt-button');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Send button click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Enter key press
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
    
    // Quick prompt buttons
    promptButtons.forEach(button => {
        button.addEventListener('click', () => {
            const prompt = button.getAttribute('data-prompt');
            sendMessage(prompt);
        });
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Handle send message
function handleSendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        sendMessage(message);
        chatInput.value = '';
    }
}

// Send message to webhook
async function sendMessage(message) {
    // Display user message
    addMessage(message, 'user');
    
    // Disable input while processing
    setInputState(false);
    
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    try {
        // Send to webhook
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                timestamp: new Date().toISOString()
            })
        });
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        if (response.ok) {
            const data = await response.json();
            
            // Extract bot response - adjust based on your webhook response structure
            let botResponse = '';
            
            // Handle array responses
            if (Array.isArray(data) && data.length > 0) {
                if (data[0].output) {
                    botResponse = data[0].output;
                } else if (data[0].message) {
                    botResponse = data[0].message;
                } else if (data[0].response) {
                    botResponse = data[0].response;
                }
            } else if (data.response) {
                botResponse = data.response;
            } else if (data.message) {
                botResponse = data.message;
            } else if (data.output) {
                botResponse = data.output;
            } else if (typeof data === 'string') {
                botResponse = data;
            } else {
                // If response structure is different, try to stringify
                botResponse = JSON.stringify(data, null, 2);
            }
            
            // Clean up the response: replace \n with actual line breaks
            botResponse = formatResponse(botResponse);
            
            addMessage(botResponse, 'bot');
        } else {
            throw new Error('Failed to get response from Snackii');
        }
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator(typingId);
        addMessage('Sorry, I encountered an error. Please try again!', 'bot');
    } finally {
        // Re-enable input
        setInputState(true);
    }
}

// Format response text
function formatResponse(text) {
    // Replace literal \n with actual line breaks
    text = text.replace(/\\n/g, '<br>');
    
    // Replace actual newline characters with <br>
    text = text.replace(/\n/g, '<br>');
    
    // Remove extra spaces and clean up
    text = text.trim();
    
    return text;
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    if (sender === 'bot') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <img src="logo.png" alt="Snackii">
            </div>
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;
    } else {
        // Escape HTML for user messages to prevent XSS
        const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${escapedText}</p>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    typingDiv.id = typingId;
    typingDiv.className = 'message bot-message';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <img src="logo.png" alt="Snackii">
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingId;
}

// Remove typing indicator
function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId);
    if (typingDiv) {
        typingDiv.remove();
    }
}

// Set input state (enabled/disabled)
function setInputState(enabled) {
    chatInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    
    if (enabled) {
        chatInput.focus();
    }
}

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > lastScroll && currentScroll > 100) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
});
