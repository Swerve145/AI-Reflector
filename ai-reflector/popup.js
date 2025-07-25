// Enhanced Popup functionality for AI Reflection Helper
document.addEventListener('DOMContentLoaded', function() {
  const ui = {
    loading: document.getElementById('loading'),
    content: document.getElementById('content'),
    streakCount: document.getElementById('streak-count'),
    queryCount: document.getElementById('query-count'),
    reflectionCount: document.getElementById('reflection-count'),
    sessionTime: document.getElementById('session-time'),
    avgWords: document.getElementById('avg-words'),
    qualityPercentage: document.getElementById('quality-percentage'),
    qualityFill: document.getElementById('quality-fill'),
    exportBtn: document.getElementById('export-data'),
    toggleBtn: document.getElementById('toggle-extension'),
    toggleText: document.getElementById('toggle-text'),
    resetBtn: document.getElementById('reset-stats'),
    guideBtn: document.getElementById('open-guide'),
    status: document.getElementById('status'),
    statusText: document.getElementById('status-text')
  };

  let updateInterval;

  // Initialize
  loadStats();
  setupEventListeners();
  startAutoUpdate();

  function loadStats() {
    chrome.storage.local.get(['reflectionSession', 'extensionEnabled'], function(result) {
      const session = result.reflectionSession || {
        queries: 0,
        reflections: [],
        streak: 0,
        totalReflectionTime: 0,
        startTime: Date.now()
      };
      
      const enabled = result.extensionEnabled !== false;
      
      updateUI(session, enabled);
    });
  }

  function updateUI(session, enabled) {
    // Update streak
    ui.streakCount.textContent = session.streak || 0;
    
    // Update query count
    ui.queryCount.textContent = session.queries || 0;
    
    // Update reflection count
    ui.reflectionCount.textContent = session.reflections.length;
    
    // Update session time
    const sessionMinutes = Math.floor((Date.now() - session.startTime) / 60000);
    if (sessionMinutes < 60) {
      ui.sessionTime.textContent = `${sessionMinutes}m`;
    } else {
      const hours = Math.floor(sessionMinutes / 60);
      const mins = sessionMinutes % 60;
      ui.sessionTime.textContent = `${hours}h ${mins}m`;
    }
    
    // Calculate average words and quality
    if (session.reflections.length > 0) {
      const totalWords = session.reflections.reduce((sum, r) => {
        return sum + (r.word_count || r.text.split(/\s+/).length);
      }, 0);
      const avgWords = Math.round(totalWords / session.reflections.length);
      ui.avgWords.textContent = avgWords;
      
      // Calculate quality score
      const totalQuality = session.reflections.reduce((sum, r) => {
        return sum + (r.quality_score || 5);
      }, 0);
      const avgQuality = totalQuality / session.reflections.length;
      const qualityPercent = Math.round((avgQuality / 10) * 100);
      
      ui.qualityPercentage.textContent = `${qualityPercent}%`;
      ui.qualityFill.style.width = `${qualityPercent}%`;
      
      // Color code quality
      if (qualityPercent >= 80) {
        ui.qualityFill.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      } else if (qualityPercent >= 60) {
        ui.qualityFill.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      } else if (qualityPercent >= 40) {
        ui.qualityFill.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      } else {
        ui.qualityFill.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      }
    } else {
      ui.avgWords.textContent = '0';
      ui.qualityPercentage.textContent = '0%';
      ui.qualityFill.style.width = '0%';
    }
    
    // Update status
    updateStatus(enabled);
  }

  function updateStatus(enabled) {
    if (enabled) {
      ui.status.className = 'status active';
      ui.statusText.textContent = 'Extension Active';
      ui.toggleText.textContent = 'Pause Extension';
      ui.toggleBtn.querySelector('.btn-icon').textContent = '⏸️';
    } else {
      ui.status.className = 'status inactive';
      ui.statusText.textContent = 'Extension Paused';
      ui.toggleText.textContent = 'Resume Extension';
      ui.toggleBtn.querySelector('.btn-icon').textContent = '▶️';
    }
  }

  function setupEventListeners() {
    // Export data
    ui.exportBtn.addEventListener('click', async function() {
      const btn = this;
      const originalHtml = btn.innerHTML;
      
      try {
        // Show loading state
        btn.innerHTML = '<span class="btn-icon">⏳</span><span>Exporting...</span>';
        btn.disabled = true;
        
        const result = await chrome.storage.local.get(['reflectionSession']);
        if (result.reflectionSession) {
          const exportData = {
            ...result.reflectionSession,
            exportDate: new Date().toISOString(),
            version: '2.0'
          };
          
          const dataStr = JSON.stringify(exportData, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `reflection_data_${new Date().toISOString().split('T')[0]}.json`;
          link.click();
          
          URL.revokeObjectURL(url);
          
          // Show success
          btn.innerHTML = '<span class="btn-icon">✅</span><span>Exported!</span>';
          btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
          
          setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.background = '';
            btn.disabled = false;
          }, 2000);
        }
      } catch (error) {
        console.error('Export error:', error);
        btn.innerHTML = '<span class="btn-icon">❌</span><span>Export Failed</span>';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }, 2000);
      }
    });
    
    // Toggle extension
    ui.toggleBtn.addEventListener('click', async function() {
      const result = await chrome.storage.local.get(['extensionEnabled']);
      const currentlyEnabled = result.extensionEnabled !== false;
      const newState = !currentlyEnabled;
      
      // Animate button
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 200);
      
      await chrome.storage.local.set({ 'extensionEnabled': newState });
      
      // Send message to content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && (tabs[0].url.includes('chat.openai.com') || tabs[0].url.includes('chatgpt.com'))) {
        try {
          await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleExtension',
            enabled: newState
          });
        } catch (error) {
          console.log('Could not send message to tab:', error);
        }
      }
      
      updateStatus(newState);
    });
    
    // Reset stats
    ui.resetBtn.addEventListener('click', function() {
      const confirmDialog = confirm(
        '⚠️ Reset All Statistics?\n\n' +
        'This will clear:\n' +
        '• All reflections\n' +
        '• Your streak\n' +
        '• Session data\n\n' +
        'This cannot be undone!'
      );

      // Open guide button
    ui.guideBtn.addEventListener('click', function() {
      chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') });
    });
      
      if (confirmDialog) {
        chrome.storage.local.set({
          'reflectionSession': {
            queries: 0,
            reflections: [],
            streak: 0,
            totalReflectionTime: 0,
            startTime: Date.now()
          }
        }, function() {
          // Animate reset
          ui.content.style.opacity = '0';
          ui.loading.style.display = 'flex';
          
          setTimeout(() => {
            loadStats();
            ui.loading.style.display = 'none';
            ui.content.style.opacity = '1';
            
            // Show success feedback
            const btn = ui.resetBtn;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<span class="btn-icon">✅</span><span>Reset Complete</span>';
            btn.style.background = '#dcfce7';
            btn.style.color = '#166534';
            
            setTimeout(() => {
              btn.innerHTML = originalHtml;
              btn.style.background = '';
              btn.style.color = '';
            }, 2000);
          }, 500);
        });
      }
    });
  }

  function startAutoUpdate() {
    // Update stats every 3 seconds when popup is open
    updateInterval = setInterval(loadStats, 3000);
  }

  // Clean up when popup closes
  window.addEventListener('unload', function() {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ui.exportBtn.click();
    } else if (e.key === ' ') {
      e.preventDefault();
      ui.toggleBtn.click();
    }
  });
});