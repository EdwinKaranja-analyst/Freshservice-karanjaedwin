

// CRITICAL: Replace this with your NEW API key (after revoking the old one!)
const API_KEY = 'ikh9PpGIfPnyRetEczIT'
// Configuration
const CONFIG = {
    domain: 'karanjaedwin',
    stages: {
        initial: 'Initial Review',
        desk: 'Desk Analysis', 
        field: 'Field Investigation'
    },
    refreshInterval: 30000
};

// Global state - properly initialized to avoid race conditions
const APP_STATE = {
    client: null,
    currentStage: 'initial',
    tickets: [],
    selectedTicket: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    app.initialized()
        .then(function(client) {
            APP_STATE.client = client;
            console.log('App initialized successfully');
            
            // Set up event listeners
            setupEventListeners();
            
            // Load initial data
            loadAgentInfo();
            loadAllTickets();
            
            // Set up periodic refresh
            setInterval(refreshData, CONFIG.refreshInterval);
        })
        .catch(function(error) {
            console.error('Error initializing app:', error);
            showError('Failed to initialize app');
        });
});

// Set up all event listeners
function setupEventListeners() {
    // Tab clicks
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const stage = this.getAttribute('data-stage');
            switchToStage(stage);
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterTickets);
    }

    // Priority filter
    const priorityFilter = document.getElementById('priorityFilter');
    if (priorityFilter) {
        priorityFilter.addEventListener('change', filterTickets);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Load agent information
async function loadAgentInfo() {
    try {
        if (!APP_STATE.client) return;
        
        const data = await APP_STATE.client.data.get('loggedInUser');
        const agentName = data.loggedInUser.display_name || 'Agent';
        
        const agentElement = document.getElementById('agentName');
        if (agentElement) {
            agentElement.textContent = agentName;
        }
    } catch (error) {
        console.error('Error loading agent info:', error);
    }
}

// Load all tickets using Freshservice API
async function loadAllTickets() {
    showLoading(true);
    
    try {
        if (!APP_STATE.client) return;
        
        // Use the Freshservice client to make API calls
        const response = await APP_STATE.client.request.get(
            `https://${CONFIG.domain}.freshservice.com/api/v2/tickets?include=stats&per_page=100`,
            {
                headers: {
                    'Authorization': 'Basic ' + btoa(API_KEY + ':X'),
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const fetchedTickets = response.tickets || [];
        
        // In production, you'd filter by actual custom fields
        // For POC, simulate stage assignment
        APP_STATE.tickets = fetchedTickets.map((ticket, index) => {
            // Assign stages for demo
            if (index % 3 === 0) {
                ticket.investigation_stage = CONFIG.stages.initial;
            } else if (index % 3 === 1) {
                ticket.investigation_stage = CONFIG.stages.desk;
            } else {
                ticket.investigation_stage = CONFIG.stages.field;
            }
            
            // Add simulated risk score
            ticket.risk_score = Math.floor(Math.random() * 10) + 1;
            
            return ticket;
        });
        
        updateStats();
        displayTickets();
        updateLastRefresh();
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        showToast('Error loading tickets. Please check your API key.', 'error');
    } finally {
        showLoading(false);
    }
}

// Switch between stages
function switchToStage(stage) {
    APP_STATE.currentStage = stage;
    
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.getAttribute('data-stage') === stage) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Display filtered tickets
    displayTickets();
}

// Display tickets for current stage
function displayTickets() {
    const stageTickets = APP_STATE.tickets.filter(ticket => 
        ticket.investigation_stage === CONFIG.stages[APP_STATE.currentStage]
    );
    
    const listContainer = document.getElementById('ticketList');
    if (!listContainer) return;
    
    if (stageTickets.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>No tickets in ${CONFIG.stages[APP_STATE.currentStage]}</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = stageTickets.map(ticket => `
        <div class="ticket-card" data-ticket-id="${ticket.id}" onclick="selectTicket(${ticket.id})">
            <div class="ticket-header">
                <span class="ticket-number">#${ticket.id}</span>
                <span class="ticket-priority priority-${getPriorityClass(ticket.priority)}">
                    ${getPriorityLabel(ticket.priority)}
                </span>
            </div>
            <div class="ticket-subject">${escapeHtml(ticket.subject)}</div>
            <div class="ticket-meta">
                <span>👤 ${escapeHtml(ticket.requester_name || 'Unknown')}</span>
                <span>📅 ${formatDate(ticket.created_at)}</span>
                <span class="risk-indicator risk-${getRiskClass(ticket.risk_score)}">
                    ⚠️ Risk: ${ticket.risk_score}/10
                </span>
            </div>
        </div>
    `).join('');
}

// Select and display ticket details
async function selectTicket(ticketId) {
    // Update UI selection
    document.querySelectorAll('.ticket-card').forEach(card => {
        card.classList.toggle('selected', parseInt(card.dataset.ticketId) === ticketId);
    });
    
    try {
        if (!APP_STATE.client) return;
        
        // Load full ticket details
        const response = await APP_STATE.client.request.get(
            `https://${CONFIG.domain}.freshservice.com/api/v2/tickets/${ticketId}`,
            {
                headers: {
                    'Authorization': 'Basic ' + btoa(API_KEY + ':X'),
                    'Content-Type': 'application/json'
                }
            }
        );
        
        APP_STATE.selectedTicket = response.ticket;
        displayTicketDetails();
        
    } catch (error) {
        console.error('Error loading ticket details:', error);
        showToast('Error loading ticket details', 'error');
    }
}

// Display detailed ticket information
function displayTicketDetails() {
    if (!APP_STATE.selectedTicket) return;
    
    const detailsContainer = document.getElementById('ticketDetails');
    if (!detailsContainer) return;
    
    const ticket = APP_STATE.selectedTicket;
    
    detailsContainer.innerHTML = `
        <div class="detail-section">
            <h2 class="detail-title">Ticket #${ticket.id}</h2>
            <div class="detail-field">
                <span class="detail-label">Subject:</span>
                <span class="detail-value">${escapeHtml(ticket.subject)}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Stage:</span>
                <span class="detail-value">${ticket.investigation_stage}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Priority:</span>
                <span class="detail-value">${getPriorityLabel(ticket.priority)}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Risk Score:</span>
                <span class="detail-value">
                    <span class="risk-indicator risk-${getRiskClass(ticket.risk_score)}">
                        ${ticket.risk_score}/10
                    </span>
                </span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${formatDateTime(ticket.created_at)}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3 class="detail-title">Description</h3>
            <p>${escapeHtml(ticket.description_text || 'No description available')}</p>
        </div>
        
        <div class="action-buttons">
            <button class="btn btn-primary" onclick="moveToNextStage()">
                Move to Next Stage →
            </button>
            <button class="btn btn-secondary" onclick="openInFreshservice()">
                Open in Freshservice
            </button>
        </div>
    `;
}

// Move ticket to next stage
async function moveToNextStage() {
    if (!APP_STATE.selectedTicket) return;
    
    const stageOrder = ['Initial Review', 'Desk Analysis', 'Field Investigation', 'Completed'];
    const currentIndex = stageOrder.indexOf(APP_STATE.selectedTicket.investigation_stage);
    
    if (currentIndex < stageOrder.length - 1) {
        const nextStage = stageOrder[currentIndex + 1];
        
        try {
            // In production, update the custom field via API
            // For now, show success message
            showToast(`Moving ticket to ${nextStage}`, 'success');
            
            // Simulate update
            APP_STATE.selectedTicket.investigation_stage = nextStage;
            
            // Reload tickets
            await loadAllTickets();
            
        } catch (error) {
            showToast('Error updating ticket', 'error');
        }
    } else {
        showToast('Ticket is already in final stage', 'info');
    }
}

// Open ticket in Freshservice
function openInFreshservice() {
    if (!APP_STATE.selectedTicket || !APP_STATE.client) return;
    
    // Use Freshservice interface navigation
    APP_STATE.client.interface.trigger('showModal', {
        title: `Ticket #${APP_STATE.selectedTicket.id}`,
        template: 'modal.html',
        data: { ticketId: APP_STATE.selectedTicket.id }
    }).catch(() => {
        // Fallback to opening in new tab
        window.open(`https://${CONFIG.domain}.freshservice.com/helpdesk/tickets/${APP_STATE.selectedTicket.id}`, '_blank');
    });
}

// Update statistics
function updateStats() {
    const stats = {
        initial: APP_STATE.tickets.filter(t => t.investigation_stage === CONFIG.stages.initial).length,
        desk: APP_STATE.tickets.filter(t => t.investigation_stage === CONFIG.stages.desk).length,
        field: APP_STATE.tickets.filter(t => t.investigation_stage === CONFIG.stages.field).length
    };
    
    document.getElementById('stat-initial').textContent = stats.initial;
    document.getElementById('stat-desk').textContent = stats.desk;
    document.getElementById('stat-field').textContent = stats.field;
    document.getElementById('stat-total').textContent = stats.initial + stats.desk + stats.field;
}

// Filter tickets based on search and priority
function filterTickets() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const priorityFilter = document.getElementById('priorityFilter')?.value || '';
    
    const cards = document.querySelectorAll('.ticket-card');
    cards.forEach(card => {
        const subject = card.querySelector('.ticket-subject').textContent.toLowerCase();
        const ticketId = card.dataset.ticketId;
        const ticket = APP_STATE.tickets.find(t => t.id === parseInt(ticketId));
        
        const matchesSearch = !searchTerm || 
            subject.includes(searchTerm) || 
            ticketId.includes(searchTerm);
            
        const matchesPriority = !priorityFilter || 
            (ticket && ticket.priority === parseInt(priorityFilter));
        
        card.style.display = matchesSearch && matchesPriority ? 'block' : 'none';
    });
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                switchToStage('initial');
                e.preventDefault();
                break;
            case '2':
                switchToStage('desk');
                e.preventDefault();
                break;
            case '3':
                switchToStage('field');
                e.preventDefault();
                break;
            case 'r':
                refreshData();
                e.preventDefault();
                break;
        }
    }
}

// Refresh data
async function refreshData() {
    await loadAllTickets();
    showToast('Data refreshed', 'info');
}

// Helper functions
function getPriorityClass(priority) {
    if (priority >= 3) return 'high';
    if (priority === 2) return 'medium';
    return 'low';
}

function getPriorityLabel(priority) {
    const labels = { 
        1: 'Low', 
        2: 'Medium', 
        3: 'High', 
        4: 'Urgent' 
    };
    return labels[priority] || 'Unknown';
}

function getRiskClass(score) {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}

function updateLastRefresh() {
    const element = document.getElementById('lastRefresh');
    if (element) {
        element.textContent = new Date().toLocaleTimeString();
    }
}

function showLoading(show) {
    const listContainer = document.getElementById('ticketList');
    if (!listContainer) return;
    
    if (show) {
        listContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading tickets...</p>
            </div>
        `;
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#e74c3c' : 
                           type === 'info' ? '#3498db' : '#2ecc71';
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showError(message) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.innerHTML = `
            <div style="color: #dc2626; text-align: center; padding: 20px;">
                <p style="font-size: 18px; margin-bottom: 10px;">⚠️ Error</p>
                <p>${message}</p>
            </div>
        `;
        loading.style.display = 'flex';
    }
}

// Security: Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Make functions available globally for onclick handlers
window.selectTicket = selectTicket;
window.moveToNextStage = moveToNextStage;
window.openInFreshservice = openInFreshservice;