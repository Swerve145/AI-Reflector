// AI Reflection Helper - Enhanced Content Script
class ReflectionExtension {
  constructor() {
    this.isReflectionActive = false;
    this.lastProcessedResponse = null;
    this.extensionEnabled = true;
    this.currentReflectionBox = null;
    this.sessionData = {
      queries: 0,
      reflections: [],
      streak: 0,
      totalReflectionTime: 0,
      startTime: Date.now()
    };
    this.init();
  }

  init() {
    console.log('🚀 AI Reflection Helper initialized');
    this.loadSettings();
    this.observeMessages();
    this.loadSessionData();
    this.preventCheating();
  }

  loadSettings() {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      this.extensionEnabled = result.extensionEnabled !== false;
    });
  }

  // Enhanced mutation observer for ChatGPT responses
  observeMessages() {
    let debounceTimer;
    const observer = new MutationObserver((mutations) => {
      if (!this.extensionEnabled || this.isReflectionActive) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
        if (assistantMessages.length > 0) {
          const latestMessage = assistantMessages[assistantMessages.length - 1];
          
          // Check if this is a new message we haven't processed
          const messageId = this.getMessageId(latestMessage);
          if (messageId && messageId !== this.lastProcessedResponse) {
            this.lastProcessedResponse = messageId;
            this.handleNewResponse(latestMessage);
          }
        }
      }, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  getMessageId(element) {
    // Create a unique ID based on content and position
    const text = element.innerText || '';
    const position = Array.from(element.parentNode?.children || []).indexOf(element);
    return `${position}-${text.substring(0, 50)}`;
  }

  handleNewResponse(messageElement) {
    if (this.isReflectionActive) return;
    
    this.sessionData.queries++;
    const startTime = Date.now();
    
    // Extract meaningful content
    const content = this.extractMeaningfulContent(messageElement);
    
    setTimeout(() => {
      this.showReflectionOverlay(messageElement, content, startTime);
    }, 500);
  }

  extractMeaningfulContent(messageElement) {
    const fullText = messageElement.innerText || "";
    
    // Try to extract the most meaningful part
    let meaningfulContent = "";
    
    // Look for key sections
    const lines = fullText.split('\n').filter(line => line.trim());
    
    // Find the first substantive paragraph (not just acknowledgments)
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      
      // Skip generic openings
      if (line.match(/^(Sure|Certainly|Of course|Here's|Here is|I'll|I will|Let me)/i)) {
        continue;
      }
      
      // Look for actual content
      if (line.length > 50) {
        meaningfulContent = line;
        break;
      }
    }
    
    // If no meaningful content found, get the first substantial paragraph
    if (!meaningfulContent) {
      const paragraphs = fullText.split(/\n\n+/);
      for (const para of paragraphs) {
        if (para.length > 80 && !para.match(/^(Sure|Certainly|Here)/i)) {
          meaningfulContent = para;
          break;
        }
      }
    }
    
    // Fallback to first 300 chars if nothing found
    if (!meaningfulContent) {
      meaningfulContent = fullText.substring(0, 300);
    }
    
    // Clean up and limit length
    meaningfulContent = meaningfulContent.replace(/\s+/g, ' ').trim();
    if (meaningfulContent.length > 250) {
      meaningfulContent = meaningfulContent.substring(0, 250) + '...';
    }
    
    return {
      preview: meaningfulContent,
      fullText: fullText,
      isCode: fullText.includes('```'),
      isList: fullText.includes('1.') || fullText.includes('•'),
      wordCount: fullText.split(/\s+/).length
    };
  }

  showReflectionOverlay(messageElement, content, startTime) {
    this.isReflectionActive = true;
    this.disableInterface();
    
    // Remove any existing overlay
    if (this.currentReflectionBox) {
      this.currentReflectionBox.remove();
    }

    const overlay = this.createOverlay(content, startTime);
    this.currentReflectionBox = overlay;
    document.body.appendChild(overlay);
    
    // Add entrance animation
    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });
  }

  createOverlay(content, startTime) {
    const overlay = document.createElement('div');
    overlay.className = 'reflection-floating-box';
    
    const reflectionPrompt = this.getSmartPrompt(content);
    
    overlay.innerHTML = `
      <div class="reflection-box">
        <div class="reflection-header">
          <div class="header-content">
            <div class="logo">🧠</div>
            <div class="header-text">
              <h4>Time to Reflect!</h4>
              <p class="streak-display">🔥 Streak: ${this.sessionData.streak}</p>
            </div>
          </div>
          <div class="box-controls">
            <button class="minimize-btn" title="Minimize">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="reflection-content">
          <div class="ai-response-preview">
            <div class="preview-header">
              <span class="preview-icon">💬</span>
              <h5>AI Response Summary</h5>
              <span class="word-count">${content.wordCount} words</span>
            </div>
            <div class="response-preview-text">${content.preview}</div>
            <div class="preview-footer">
              <span class="preview-type">${this.getContentType(content)}</span>
              <span class="preview-hint">📖 Read the full response below</span>
            </div>
          </div>
          
          <div class="reflection-prompt">
            <h5>
              <span class="prompt-icon">✍️</span>
              ${reflectionPrompt.title}
            </h5>
            <p class="prompt-description">${reflectionPrompt.description}</p>
            <div class="prompt-questions">
              ${reflectionPrompt.questions.map(q => `
                <div class="question-item">
                  <span class="question-bullet">▸</span>
                  <span>${q}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="reflection-input">
            <textarea 
              id="reflection-text" 
              placeholder="Take a moment to think, then write your reflection..."
              rows="4"
              data-start-time="${startTime}"
            ></textarea>
            <div class="input-footer">
              <div class="char-count">
                <span id="char-count">0</span> / 50 characters
              </div>
              <div class="quality-indicator" id="quality-indicator">
                <span class="quality-dot"></span>
                <span class="quality-text">Keep writing...</span>
              </div>
            </div>
          </div>

          <div class="reflection-actions">
            <button id="submit-reflection" class="submit-btn" disabled>
              <span class="btn-text">Need 50+ characters</span>
              <span class="btn-icon">→</span>
            </button>
          </div>

          <div class="motivation-text">
            💡 ${this.getMotivationalText()}
          </div>
        </div>
      </div>
    `;

    this.setupOverlayListeners(overlay, content);
    return overlay;
  }

  getSmartPrompt(content) {
    const prompts = {
      code: {
        title: "Understanding the Code",
        description: "Before using this code, make sure you understand how it works:",
        questions: [
          "What does this code actually do?",
          "Why does this approach work?",
          "What would happen if you changed a key part?",
          "How could you adapt this for a different problem?"
        ]
      },
      list: {
        title: "Processing the Information",
        description: "This response contains multiple points. Let's make sure you've absorbed them:",
        questions: [
          "Which point is most important and why?",
          "How do these points connect to each other?",
          "What examples can you think of for each point?",
          "Which part will be most useful for your work?"
        ]
      },
      explanation: {
        title: "Making It Your Own",
        description: "Now that you've read the explanation, internalize it:",
        questions: [
          "Explain this concept in your own words",
          "Why is this important to understand?",
          "How does this connect to what you already know?",
          "What questions do you still have?"
        ]
      },
      default: {
        title: "Reflect & Learn",
        description: "Take a moment to process what you just learned:",
        questions: [
          "What's the key insight from this response?",
          "How will you apply this information?",
          "What part was most surprising or useful?",
          "What would you explain differently?"
        ]
      }
    };

    if (content.isCode) return prompts.code;
    if (content.isList) return prompts.list;
    if (content.wordCount > 200) return prompts.explanation;
    return prompts.default;
  }

  getContentType(content) {
    if (content.isCode) return "📝 Code Solution";
    if (content.isList) return "📋 List/Steps";
    if (content.wordCount > 200) return "📚 Detailed Explanation";
    return "💭 General Response";
  }

  getMotivationalText() {
    const messages = [
      "Active learning boosts retention by 50%!",
      "This reflection will help you remember better",
      "Great thinkers always reflect on new knowledge",
      "You're building stronger neural pathways!",
      "Every reflection makes you a better learner"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  setupOverlayListeners(overlay, content) {
    const textarea = overlay.querySelector('#reflection-text');
    const submitBtn = overlay.querySelector('#submit-reflection');
    const charCount = overlay.querySelector('#char-count');
    const minimizeBtn = overlay.querySelector('.minimize-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const qualityIndicator = overlay.querySelector('#quality-indicator');
    const qualityDot = qualityIndicator.querySelector('.quality-dot');
    const qualityText = qualityIndicator.querySelector('.quality-text');

    // Minimize functionality
    let isMinimized = false;
    minimizeBtn.addEventListener('click', () => {
      const content = overlay.querySelector('.reflection-content');
      const svg = minimizeBtn.querySelector('svg');
      
      if (isMinimized) {
        content.style.display = 'block';
        svg.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"></line>';
        minimizeBtn.title = 'Minimize';
        overlay.classList.remove('minimized');
      } else {
        content.style.display = 'none';
        svg.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
        minimizeBtn.title = 'Restore';
        overlay.classList.add('minimized');
      }
      isMinimized = !isMinimized;
    });

    // Enhanced character count with quality indicator
    textarea.addEventListener('input', (e) => {
      const text = e.target.value;
      const length = text.length;
      charCount.textContent = length;
      
      // Update button state
      if (length >= 50) {
        submitBtn.disabled = false;
        submitBtn.classList.add('ready');
        charCount.style.color = '#10b981';
        
        // Dynamic button text based on quality
        if (length >= 200) {
          btnText.textContent = 'Excellent reflection! Submit';
          qualityDot.className = 'quality-dot excellent';
          qualityText.textContent = 'Excellent depth!';
        } else if (length >= 100) {
          btnText.textContent = 'Good reflection! Submit';
          qualityDot.className = 'quality-dot good';
          qualityText.textContent = 'Good progress!';
        } else {
          btnText.textContent = 'Submit Reflection';
          qualityDot.className = 'quality-dot basic';
          qualityText.textContent = 'Basic reflection';
        }
      } else {
        submitBtn.disabled = true;
        submitBtn.classList.remove('ready');
        btnText.textContent = `Need ${50 - length} more characters`;
        charCount.style.color = length > 25 ? '#f59e0b' : '#ef4444';
        qualityDot.className = 'quality-dot';
        qualityText.textContent = 'Keep writing...';
      }
    });

    // Submit reflection
    submitBtn.addEventListener('click', () => {
      const startTime = parseInt(textarea.dataset.startTime);
      const reflectionTime = Date.now() - startTime;
      this.submitReflection(textarea.value, overlay, reflectionTime);
    });

    // Enter to submit (with Shift+Enter for new line)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !submitBtn.disabled) {
        e.preventDefault();
        submitBtn.click();
      }
    });

    // Make draggable
    this.makeDraggable(overlay);
  }

  submitReflection(reflectionText, overlay, reflectionTime) {
    // Update streak
    this.sessionData.streak++;
    
    const reflectionData = {
      timestamp: Date.now(),
      text: reflectionText,
      query_number: this.sessionData.queries,
      time_to_reflect: Math.round(reflectionTime / 1000), // in seconds
      quality_score: this.calculateQualityScore(reflectionText),
      word_count: reflectionText.split(/\s+/).length
    };

    this.sessionData.reflections.push(reflectionData);
    this.sessionData.totalReflectionTime += reflectionTime;
    this.saveSessionData();

    // Show success animation
    this.showSuccessAnimation(overlay);
    
    // Clean up and reset
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        this.currentReflectionBox = null;
        this.isReflectionActive = false;
        this.enableInterface();
      }, 300);
    }, 1500);
  }

  calculateQualityScore(text) {
    let score = 0;
    
    // Length score
    const words = text.split(/\s+/).length;
    score += Math.min(words / 10, 5); // Max 5 points for 50+ words
    
    // Question indicators
    if (text.includes('?')) score += 1;
    
    // Explanation indicators
    const explanationWords = ['because', 'since', 'therefore', 'means', 'understand', 'learned'];
    explanationWords.forEach(word => {
      if (text.toLowerCase().includes(word)) score += 0.5;
    });
    
    // Personal connection indicators
    const personalWords = ['I think', 'I believe', 'my', 'me', 'I will', 'I can'];
    personalWords.forEach(phrase => {
      if (text.toLowerCase().includes(phrase.toLowerCase())) score += 0.5;
    });
    
    return Math.min(Math.round(score), 10); // Max score of 10
  }

  showSuccessAnimation(overlay) {
    const box = overlay.querySelector('.reflection-box');
    box.innerHTML = `
      <div class="success-content">
        <div class="success-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3>Excellent Reflection!</h3>
        <p>🔥 Streak: ${this.sessionData.streak}</p>
        <div class="success-stats">
          <div class="stat-item">
            <span class="stat-value">${this.sessionData.reflections.length}</span>
            <span class="stat-label">Total Reflections</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${Math.round(this.sessionData.totalReflectionTime / 1000 / 60)}m</span>
            <span class="stat-label">Time Reflecting</span>
          </div>
        </div>
      </div>
    `;
    box.classList.add('success');
  }

  preventCheating() {
    // Prevent copy/cut on AI responses when reflection is active
    document.addEventListener('copy', this.handleCopyAttempt);
    document.addEventListener('cut', this.handleCopyAttempt);
    
    // Prevent right-click on AI responses
    document.addEventListener('contextmenu', this.handleContextMenu);
    
    // Prevent text selection shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleCopyAttempt = (e) => {
    if (this.isReflectionActive && !e.target.closest('.reflection-floating-box')) {
      e.preventDefault();
      this.showCopyWarning();
      return false;
    }
  };

  handleContextMenu = (e) => {
    if (this.isReflectionActive && !e.target.closest('.reflection-floating-box')) {
      e.preventDefault();
      return false;
    }
  };

  handleKeyDown = (e) => {
    if (this.isReflectionActive && !e.target.closest('.reflection-floating-box')) {
      // Prevent Ctrl+A (select all)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        return false;
      }
    }
  };

  showCopyWarning() {
    // Remove existing warning
    const existing = document.querySelector('.copy-warning');
    if (existing) existing.remove();

    const warning = document.createElement('div');
    warning.className = 'copy-warning';
    warning.innerHTML = `
      <div class="warning-content">
        <span class="warning-icon">🚫</span>
        <span class="warning-text">Please reflect on the content instead of copying!</span>
      </div>
    `;
    document.body.appendChild(warning);

    // Shake the reflection box
    if (this.currentReflectionBox) {
      const box = this.currentReflectionBox.querySelector('.reflection-box');
      box.classList.add('shake');
      setTimeout(() => box.classList.remove('shake'), 600);
    }

    setTimeout(() => {
      warning.classList.add('fade-out');
      setTimeout(() => warning.remove(), 300);
    }, 2000);
  }

  disableInterface() {
    // Create interaction blocker
    const blocker = document.createElement('div');
    blocker.className = 'reflection-blocker';
    blocker.innerHTML = `
      <div class="blocker-message">
        <span class="blocker-icon">🤔</span>
        <span>Complete your reflection to continue</span>
      </div>
    `;
    document.body.appendChild(blocker);

    // Disable ChatGPT input
    const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
    inputs.forEach(input => {
      if (!input.closest('.reflection-floating-box')) {
        input.setAttribute('data-reflection-disabled', 'true');
        input.disabled = true;
        input.style.pointerEvents = 'none';
        input.style.opacity = '0.5';
      }
    });

    // Disable buttons
    const buttons = document.querySelectorAll('button, [role="button"]');
    buttons.forEach(btn => {
      if (!btn.closest('.reflection-floating-box')) {
        btn.setAttribute('data-reflection-disabled', 'true');
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
      }
    });

    // Prevent text selection on AI responses
    const responses = document.querySelectorAll('[data-message-author-role="assistant"]');
    responses.forEach(response => {
      response.style.userSelect = 'none';
      response.style.webkitUserSelect = 'none';
    });
  }

  enableInterface() {
    // Remove blocker
    const blocker = document.querySelector('.reflection-blocker');
    if (blocker) {
      blocker.classList.add('fade-out');
      setTimeout(() => blocker.remove(), 300);
    }

    // Re-enable elements
    document.querySelectorAll('[data-reflection-disabled="true"]').forEach(el => {
      el.removeAttribute('data-reflection-disabled');
      el.disabled = false;
      el.style.pointerEvents = '';
      el.style.opacity = '';
    });

    // Re-enable text selection
    const responses = document.querySelectorAll('[data-message-author-role="assistant"]');
    responses.forEach(response => {
      response.style.userSelect = '';
      response.style.webkitUserSelect = '';
    });

    // Focus back on input
    setTimeout(() => {
      const input = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Message"]');
      if (input) input.focus();
    }, 400);
  }

  makeDraggable(element) {
    const header = element.querySelector('.reflection-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const dragStart = (e) => {
      if (e.target.closest('.box-controls')) return;
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
      header.style.cursor = 'grabbing';
    };

    const dragMove = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      
      element.style.transform = `translate(${currentX}px, ${currentY}px)`;
    };

    const dragEnd = () => {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      header.style.cursor = 'grab';
    };

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
  }

  saveSessionData() {
    chrome.storage.local.set({
      'reflectionSession': this.sessionData
    });
  }

  loadSessionData() {
    chrome.storage.local.get(['reflectionSession'], (result) => {
      if (result.reflectionSession) {
        // Preserve streak if continuing same day
        const lastSession = result.reflectionSession;
        const lastDate = new Date(lastSession.startTime).toDateString();
        const today = new Date().toDateString();
        
        if (lastDate === today) {
          this.sessionData = { ...this.sessionData, ...lastSession };
        } else {
          // Reset streak for new day
          this.sessionData.streak = 0;
        }
      }
    });
  }
}

// Initialize the extension when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ReflectionExtension();
  });
} else {
  new ReflectionExtension();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleExtension') {
    reflectionExtension.extensionEnabled = request.enabled;
    chrome.storage.local.set({ 'extensionEnabled': request.enabled });
  }
});