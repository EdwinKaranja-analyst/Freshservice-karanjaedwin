// Simple configuration
const CONFIG = {
    refreshInterval: 30000  // Refresh every 30 seconds
};

// Global references
let appClient = null;
let activeView = 'parent';
let allTickets = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    app.initialized()
        .then(function(client) {
            appClient = client;
            console.log('App initialized');
            
            // Set up tab clicks
            setupEventListeners();
            
            // Load tickets via API
            loadTickets();
            
            // Refresh periodically
            setInterval(loadTickets, CONFIG.refreshInterval);
        })
        .catch(function(error) {
            console.error('Error:', error);
            showError('Failed to initialize app');
        });
});

// Set up tab clicks
function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchToView(view);
        });
    });
}

// Switch tabs
function switchToView(viewName) {
    // Update active tab style
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[data-view="${viewName}"]`).classList.add('active');
    
    activeView = viewName;
    displayTickets();
}

// Load all tickets
function loadTickets() {
    console.log('Loading tickets...');
    
    appClient.request.invokeTemplate('getTickets', {
        context: { filter: 'filter=all&include=stats&per_page=100' }
    })
    .then(function(response) {
        const data = JSON.parse(response.response);
        allTickets = data.tickets || [];
        console.log(`Loaded ${allTickets.length} tickets`);
        
        updateStats();
        displayTickets();
    })
    .catch(function(error) {
        console.error('Failed to load tickets:', error);
        // Just show empty table on error
        displayTickets();
    });
}

// Update statistics
function updateStats() {
    const total = allTickets.length;
    
    const deskCount = allTickets.filter(ticket => {
        const assessment = ticket.custom_fields?.desk_initial_assessment;
        return assessment && assessment !== 'None';
    }).length;
    
    const fieldCount = allTickets.filter(ticket => {
        const assessment = ticket.custom_fields?.desk_initial_assessment;
        return assessment === 'Inconclusive - need field visit' || 
               assessment === 'High risk indicators present';
    }).length;
    
    document.getElementById('total-count').textContent = total;
    document.getElementById('desk-count').textContent = deskCount;
    document.getElementById('field-count').textContent = fieldCount;
}

// Display tickets based on active view
function displayTickets() {
    const frame = document.getElementById('ticket-frame');
    const loading = document.getElementById('loading');
    
    // Filter tickets based on view
    let filteredTickets = [];
    
    switch(activeView) {
        case 'parent':
            // Show all tickets
            filteredTickets = allTickets;
            break;
            
        case 'desk':
            // Show tickets with any desk assessment
            filteredTickets = allTickets.filter(ticket => {
                const assessment = ticket.custom_fields?.desk_initial_assessment;
                return assessment && assessment !== 'None';
            });
            break;
            
        case 'field':
            // Show tickets that need field investigation
            filteredTickets = allTickets.filter(ticket => {
                const assessment = ticket.custom_fields?.desk_initial_assessment;
                return assessment === 'Inconclusive - need field visit' || 
                       assessment === 'High risk indicators present' ||
                       assessment === 'Requires further investigation';
            });
            break;
    }
    
    // Create simple HTML table
    const html = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2>${activeView.charAt(0).toUpperCase() + activeView.slice(1)} Tickets (${filteredTickets.length})</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">ID</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Subject</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Assessment</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Amount</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredTickets.map(ticket => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">#${ticket.id}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${ticket.subject || 'No subject'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${ticket.custom_fields?.desk_initial_assessment || 'Not assessed'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">$${ticket.custom_fields?.amount_disputed || '0'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${getStatusName(ticket.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${filteredTickets.length === 0 ? '<p style="text-align: center; color: #666; margin: 40px;">No tickets found</p>' : ''}
        </div>
    `;
    
    // Hide loading, show content
    loading.style.display = 'none';
    frame.style.display = 'block';
    frame.classList.add('visible');
    
    // Write to iframe
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
}

// Get status name
function getStatusName(status) {
    const statusMap = {
        2: 'Open',
        3: 'Pending', 
        4: 'Resolved',
        5: 'Closed'
    };
    return statusMap[status] || 'Unknown';
}

// Show error
function showError(message) {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <div style="color: red; text-align: center; padding: 20px;">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
    loading.style.display = 'flex';
}