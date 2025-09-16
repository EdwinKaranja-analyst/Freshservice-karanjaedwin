// CONFIGURATION - Your actual view IDs
const CONFIG = {
    views: {
        parent: '30000073305',  // Parent view
        desk: '30000073338',    // Desktop view
        field: '30000073339'    // Field view
    },
    refreshInterval: 30000  // Refresh stats every 30 seconds
};

// Global app reference
let appClient = null;
let activeView = 'parent';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    app.initialized()
        .then(function(client) {
            // Store client reference
            appClient = client;
            console.log('App initialized successfully');
            
            // Set up event listeners
            setupEventListeners();
            
            // Load initial view
            loadView('parent');
            
            // Get initial stats
            updateStats();
            
            // Set up periodic refresh
            setInterval(updateStats, CONFIG.refreshInterval);
        })
        .catch(function(error) {
            console.error('Error initializing app:', error);
            showError('Failed to initialize app');
        });
});

// Set up tab click handlers
function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchToView(view);
        });
    });
}

// Switch between views
function switchToView(viewName) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[data-view="${viewName}"]`).classList.add('active');
    
    // Load the view
    loadView(viewName);
    activeView = viewName;
}

// Load view in iframe
// Load view in iframe
function loadView(viewName) {
    const frame = document.getElementById('ticket-frame');
    const loading = document.getElementById('loading');
    
    // Show loading
    loading.style.display = 'flex';
    frame.classList.remove('visible');
    
    // HARDCODE YOUR DOMAIN HERE
    const domain = 'karanjaedwin';  // Replace with your actual subdomain
    const viewId = CONFIG.views[viewName];
    
    // Set iframe source
    const viewUrl = `https://${domain}.freshservice.com/helpdesk/tickets/view/${viewId}`;
    frame.src = viewUrl;
    
    console.log(`Loading ${viewName} view: ${viewId}`);
    
    // Handle load complete
    frame.onload = function() {
        loading.style.display = 'none';
        frame.classList.add('visible');
        console.log(`Successfully loaded ${viewName} view`);
    };
}
// Update statistics
function updateStats() {
    // For POC, using static numbers
    // In production, you'd make actual API calls to count tickets
    document.getElementById('total-count').textContent = '45';
    document.getElementById('desk-count').textContent = '23';
    document.getElementById('field-count').textContent = '12';
    
    console.log('Stats updated at', new Date().toLocaleTimeString());
}

// Show error message instead of alert
function showError(message) {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <div style="color: #dc2626; text-align: center; padding: 20px;">
            <p style="font-size: 18px; margin-bottom: 10px;">⚠️ Error</p>
            <p>${message}</p>
        </div>
    `;
    loading.style.display = 'flex';
}

// Optional: Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                switchToView('parent');
                break;
            case '2':
                switchToView('desk');
                break;
            case '3':
                switchToView('field');
                break;
        }
    }
});