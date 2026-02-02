// common.js

// ------------------------------------------------------------------
// 1. ΡΥΘΜΙΣΕΙΣ SUPABASE (Τα στοιχεία σου)
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://lluvsgobvwbqlgfitlxi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PQNkye9QPBqoMBB0uJkqLg_yPrASUP0';

// ------------------------------------------------------------------
// 2. ΑΡΧΙΚΟΠΟΙΗΣΗ (Μην αλλάξεις τίποτα από εδώ και κάτω)
// ------------------------------------------------------------------
const { createClient } = supabase;
window.sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Έλεγχος αν ο χρήστης είναι συνδεδεμένος (εκτός αν είναι στη login.html)
if (!window.location.href.includes("login.html")) {
    checkSession();
}

async function checkSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
    }
}

async function logout() {
    await sb.auth.signOut();
    window.location.href = "login.html";
}

// ------------------------------------------------------------------
// 3. UI COMPONENTS (Sidebar & Toasts)
// ------------------------------------------------------------------

// Inject Global Styles for Toast and Sidebar transitions
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    .toast-enter { transform: translateX(100%); opacity: 0; }
    .toast-enter-active { transform: translateX(0); opacity: 1; transition: all 300ms ease-out; }
    .toast-exit { transform: translateX(0); opacity: 1; }
    .toast-exit-active { transform: translateX(100%); opacity: 0; transition: all 300ms ease-in; }
    
    /* Sidebar Styles */
    @media (min-width: 1024px) {
        body { padding-left: 280px; } /* Space for sidebar */
    }
    .sidebar-link:hover { background-color: rgba(255,255,255,0.05); }
    .sidebar-link.active { background-color: rgba(13, 148, 136, 0.15); border-right: 3px solid #0d9488; color: #2dd4bf; }
`;
document.head.appendChild(styleSheet);

function renderSidebar(activePage) {
    const sidebarHTML = `
    <div id="mainSidebar" class="fixed top-0 left-0 h-full w-64 bg-[#202022] border-r border-gray-800 z-40 transform -translate-x-full lg:translate-x-0 transition-transform duration-300 flex flex-col shadow-2xl">
        <div class="p-6 border-b border-gray-800 flex justify-between items-center">
            <div class="font-bold text-xl italic tracking-wider">Psaradakis<span class="text-teal-500">3D</span></div>
            <button onclick="toggleSidebar()" class="lg:hidden text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
        </div>
        
        <nav class="flex-1 overflow-y-auto py-6 space-y-1">
            ${createNavLink('index.html', 'fas fa-chart-pie', 'Dashboard', activePage === 'dashboard')}
            ${createNavLink('orders.html', 'fas fa-truck-ramp-box', 'Παραγγελίες', activePage === 'orders')}
            ${createNavLink('quotes.html', 'fas fa-file-invoice-dollar', 'Προσφορές', activePage === 'quotes')}
            
            <div class="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest mt-4">Inventory</div>
            ${createNavLink('materials.html', 'fas fa-boxes', 'Αποθήκη Υλικών', activePage === 'materials')}
            ${createNavLink('accessories.html', 'fas fa-microchip', 'Extras / Parts', activePage === 'accessories')}
            ${createNavLink('models.html', 'fas fa-cube', 'Presets / Μοντέλα', activePage === 'models')}
            ${createNavLink('clients.html', 'fas fa-users', 'Πελάτες', activePage === 'clients')}
            
            <div class="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest mt-4">Analytics</div>
            ${createNavLink('financials.html', 'fas fa-chart-line', 'Οικονομικά', activePage === 'financials')}
            ${createNavLink('history.html', 'fas fa-history', 'Ιστορικό', activePage === 'history')}
        </nav>

        <div class="p-4 border-t border-gray-800">
            <button onclick="logout()" class="flex items-center gap-3 text-gray-400 hover:text-red-400 w-full p-3 rounded-xl transition hover:bg-gray-800/50 group">
                <i class="fas fa-power-off group-hover:rotate-90 transition"></i> <span>Αποσύνδεση</span>
            </button>
        </div>
    </div>
    
    <!-- Mobile Header (Visible only on small screens) -->
    <div class="lg:hidden fixed top-0 left-0 w-full bg-[#202022]/90 backdrop-blur-md border-b border-gray-800 z-30 px-4 py-3 flex justify-between items-center">
        <div class="font-bold text-lg italic">P<span class="text-teal-500">3D</span></div>
        <button onclick="toggleSidebar()" class="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-white border border-gray-700 shadow-lg active:scale-95 transition">
            <i class="fas fa-bars"></i>
        </button>
    </div>
    `;

    // Inject Sidebar
    const container = document.createElement('div');
    container.innerHTML = sidebarHTML;
    document.body.prepend(container);
}

function createNavLink(href, icon, text, isActive) {
    const activeClass = isActive ? 'active' : 'text-gray-400 hover:text-white';
    return `
    <a href="${href}" class="sidebar-link ${activeClass} flex items-center gap-4 px-6 py-3.5 transition mx-2 rounded-xl text-sm font-medium">
        <i class="${icon} w-6 text-center text-lg ${isActive ? 'text-teal-400' : 'text-gray-500'}"></i>
        <span>${text}</span>
    </a>`;
}

function toggleSidebar() {
    const sb = document.getElementById('mainSidebar');
    if (sb.classList.contains('-translate-x-full')) {
        sb.classList.remove('-translate-x-full');
    } else {
        sb.classList.add('-translate-x-full');
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-teal-600 border-teal-400' : (type === 'error' ? 'bg-red-600 border-red-400' : 'bg-blue-600 border-blue-400');
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');

    toast.className = `toast-enter flex items-center gap-3 px-5 py-4 rounded-xl text-white shadow-2xl border-l-4 ${colors} min-w-[300px] backdrop-blur-sm bg-opacity-95`;
    toast.innerHTML = `
        <i class="fas ${icon} text-xl"></i>
        <div class="font-medium">${message}</div>
    `;

    container.appendChild(toast);

    // Animation in
    requestAnimationFrame(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-enter-active');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('toast-enter-active');
        toast.classList.add('toast-exit-active');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ------------------------------------------------------------------
// 4. HELPERS
// ------------------------------------------------------------------

// Βοηθητική συνάρτηση στρογγυλοποίησης
function round2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Γενική συνάρτηση διαγραφής με επιβεβαίωση
async function deleteRow(table, id, callback) {
    if (!confirm("Διαγραφή; Είσαι σίγουρος;")) return;

    const { error } = await sb
        .from(table)
        .delete()
        .eq('id', id);

    if (error) {
        showToast("Σφάλμα: " + error.message, 'error');
    } else {
        showToast("Διαγράφηκε επιτυχώς", 'success');
        if (callback) callback();
    }
}
