// Webhook URL
const WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook/bc0df85b-ea80-4a3e-bf1a-e255b7723ccf';

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const promptButtons = document.querySelectorAll('.prompt-button');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ensureSession();
    setupEventListeners();
});

// Ensure a stable per-tab session id so the backend can keep context
function ensureSession() {
    if (!sessionStorage.getItem('user_session_id')) {
        sessionStorage.setItem('user_session_id', `s_${Date.now()}_${Math.floor(Math.random() * 100000)}`);
    }
}

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
                // Backend expects query + session to avoid repeated replies
                query: message,
                userSession: sessionStorage.getItem('user_session_id') || null,
                timestamp: new Date().toISOString()
            })
        });
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        if (!response.ok) {
            throw new Error('Failed to get response from Snackii');
        }

        const data = await response.json().catch(() => null);
        const botResponse = extractReply(data) || 'Sorry, I encountered an error. Please try again!';
        addMessage(formatResponse(botResponse), 'bot');
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator(typingId);
        addMessage('Sorry, I encountered an error. Please try again!', 'bot');
    } finally {
        // Re-enable input
        setInputState(true);
    }
}

// Extract a displayable reply string from various possible webhook response shapes
function extractReply(resp) {
    if (!resp) return null;

    // If the webhook returned an array (e.g. [{ output: "response" }])
    if (Array.isArray(resp) && resp.length) {
        // Prefer the first element's reply if present
        const first = resp[0];
        const fromFirst = extractReply(first);
        if (fromFirst) return fromFirst;

        // Fallback: join stringified items
        return resp
            .map((it) => {
                if (typeof it === 'string') return it;
                if (it && typeof it === 'object') {
                    if (typeof it.output === 'string') return it.output;
                    if (it.output && typeof it.output.text === 'string') return it.output.text;
                    if (typeof it.text === 'string') return it.text;
                }
                return JSON.stringify(it);
            })
            .filter(Boolean)
            .join('\n');
    }

    // Common conventions: { reply: 'text' } or { output: 'text' }
    if (typeof resp === 'string') return resp;
    if (typeof resp.reply === 'string' && resp.reply.trim()) return resp.reply;
    if (typeof resp.output === 'string' && resp.output.trim()) return resp.output;

    // Some systems return { output: { text: '...' } } or nested
    if (resp.output && typeof resp.output === 'object') {
        if (typeof resp.output.text === 'string' && resp.output.text.trim()) return resp.output.text;
        if (Array.isArray(resp.output) && resp.output.length) {
            return resp.output.map((it) => (typeof it === 'string' ? it : JSON.stringify(it))).join('\n');
        }
        if (typeof resp.output.output === 'string' && resp.output.output.trim()) return resp.output.output;
    }

    // other possible keys
    if (typeof resp.text === 'string' && resp.text.trim()) return resp.text;
    if (typeof resp.result === 'string' && resp.result.trim()) return resp.result;
    return null;
}

// Format response text
function formatResponse(text) {
    if (typeof text !== 'string') {
        return '';
    }
    // Replace literal \n and real newlines with <br>
        const withBreaks = text.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
    return withBreaks.trim();
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
