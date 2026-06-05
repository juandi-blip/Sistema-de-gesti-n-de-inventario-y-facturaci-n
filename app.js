// VULCAN FORGE - Core Logística de Depósito & Suministro Industrial

// --------------------------------------------------------------------------
//   CAPA API — sincroniza con el backend cuando está disponible.
//   Si el backend no está corriendo, todo sigue funcionando con localStorage.
// --------------------------------------------------------------------------
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';

function _apiToken() {
    try { return JSON.parse(localStorage.getItem('vulcan_session') || 'null')?.token || null; }
    catch { return null; }
}

async function apiGet(endpoint) {
    const token = _apiToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

function apiPut(endpoint, data) {
    const token = _apiToken();
    if (!token) return;
    fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
    }).catch(() => {});
}

// --- CORE SYSTEM STATE ---
let state = {
    products: [],
    invoices: [],
    settings: {
        companyName: "Vulcan Forge S.A.",
        companySlogan: "Suministros de Acero e Ingeniería",
        currency: "USD",
        currencySymbol: "$",
        taxRate: 19,
        taxId: "RUT-77.928.344-9"
    },
    activeTab: 'dashboard',
    // Current invoice builder draft state
    invoiceItems: [],
    // Preparación de pedidos / Picking
    pickingLists: [],
    activePickingSub: 'panel',
    activePickingId: null
};

// --- INITIAL INDUSTRIAL DEMO DATA ---
const DEMO_PRODUCTS = [
    { id: "1", name: "Rotomartillo Percutor SDS-Max 1500W (Bosch)", sku: "SKU-BOSC-1500", category: "Herramientas Eléctricas", price: 489.00, stock: 8, threshold: 3, lot: "L-2938", mfgDate: "2026-01-15", expDate: "2028-06-15", warehouse: "Bodega Principal", aisle: "D", shelf: 3, level: 1, pickingDistance: 32, brand: "Bosch", supplier: "Bosch Latam" }, // Clase A - Mal ubicado (Pasillo D, muy lejos!)
    { id: "2", name: "Disco Flap de Desbaste 4.5\" G60 (Caja x50) (3M)", sku: "SKU-3M-FLAP60", category: "Consumibles", price: 125.00, stock: 22, threshold: 5, lot: "L-1102", mfgDate: "2026-02-10", expDate: "2027-12-31", warehouse: "Bodega Principal", aisle: "A", shelf: 1, level: 2, pickingDistance: 8, brand: "3M", supplier: "3M Distribución" }, // Clase A - Bien ubicado (Pasillo A)
    { id: "3", name: "Juego de Llaves Alen de Titanio Profesional (Stanley)", sku: "SKU-STAN-ALLEN", category: "Herramientas Manuales", price: 49.00, stock: 35, threshold: 8, lot: "L-5524", mfgDate: "2025-11-01", expDate: "2027-11-01", warehouse: "Bodega Principal", aisle: "B", shelf: 2, level: 1, pickingDistance: 15, brand: "Stanley", supplier: "Stanley Tools" }, // Clase B - Bien ubicado (Pasillo B)
    { id: "4", name: "Compresor de Aire Trifásico 3HP 100L (Kraftwerk)", sku: "SKU-KRAFT-100L", category: "Maquinaria Pesada", price: 899.00, stock: 2, threshold: 1, lot: "L-0045", mfgDate: "2025-08-20", expDate: "2030-08-20", warehouse: "Bodega Principal", aisle: "A", shelf: 4, level: 1, pickingDistance: 6, brand: "Kraftwerk", supplier: "Importadora Alemana" }, // Clase C - Mal ubicado (Ocupa Pasillo A de picking rápido con carga pesada!)
    { id: "5", name: "Soldadora Inverter Turbo Profesional 250A (Lincoln Electric)", sku: "SKU-LINC-250A", category: "Herramientas Eléctricas", price: 649.00, stock: 0, threshold: 2, lot: "L-8821", mfgDate: "2025-10-15", expDate: "2027-10-15", warehouse: "Bodega Principal", aisle: "D", shelf: 5, level: 3, pickingDistance: 38, brand: "Lincoln Electric", supplier: "Lincoln Siderúrgica" }, // Clase A - Bien ubicado (Agotado)
    { id: "6", name: "Cerradura Digital Multianclaje de Alta Seguridad (Yale)", sku: "SKU-YALE-DIGI", category: "Fijaciones", price: 185.00, stock: 12, threshold: 3, lot: "L-9021", mfgDate: "2026-03-01", expDate: "2029-03-01", warehouse: "Bodega Principal", aisle: "C", shelf: 1, level: 2, pickingDistance: 24, brand: "Yale", supplier: "Yale Seguridad" }, // Clase B - Bien ubicado (Pasillo C)
    { id: "7", name: "Taladro Atornillador Inalámbrico 20V MAX (DeWalt)", sku: "SKU-DEWA-20V", category: "Herramientas Eléctricas", price: 219.00, stock: 14, threshold: 4, lot: "L-7001", mfgDate: "2026-01-20", expDate: "2029-01-20", warehouse: "Bodega Principal", aisle: "B", shelf: 1, level: 1, pickingDistance: 12, brand: "DeWalt", supplier: "DeWalt Pro Tools" },
    { id: "8", name: "Amoladora Angular 4.5\" 900W (Makita)", sku: "SKU-MAKI-900W", category: "Herramientas Eléctricas", price: 139.00, stock: 9, threshold: 3, lot: "L-7002", mfgDate: "2025-12-05", expDate: "2028-12-05", warehouse: "Bodega Principal", aisle: "B", shelf: 2, level: 1, pickingDistance: 14, brand: "Makita", supplier: "Makita Industrial" },
    { id: "9", name: "Sierra Circular 7-1/4\" 1800W (Skil)", sku: "SKU-SKIL-1800", category: "Herramientas Eléctricas", price: 169.00, stock: 6, threshold: 2, lot: "L-7003", mfgDate: "2025-11-18", expDate: "2028-11-18", warehouse: "Bodega Principal", aisle: "B", shelf: 3, level: 2, pickingDistance: 16, brand: "Skil", supplier: "Bosch Latam" },
    { id: "10", name: "Set Destornilladores Aislados 1000V x12 (Klein Tools)", sku: "SKU-KLEIN-12", category: "Herramientas Manuales", price: 89.00, stock: 21, threshold: 5, lot: "L-7004", mfgDate: "2026-02-01", expDate: "2030-02-01", warehouse: "Bodega Principal", aisle: "B", shelf: 1, level: 2, pickingDistance: 13, brand: "Klein Tools", supplier: "Klein Distribución" },
    { id: "11", name: "Llave de Impacto Neumática 1/2\" (Ingersoll Rand)", sku: "SKU-INGR-12", category: "Herramientas Eléctricas", price: 299.00, stock: 4, threshold: 2, lot: "L-7005", mfgDate: "2025-10-22", expDate: "2029-10-22", warehouse: "Bodega Principal", aisle: "B", shelf: 4, level: 1, pickingDistance: 18, brand: "Ingersoll Rand", supplier: "IR Neumática" },
    { id: "12", name: "Juego de Dados Cromo Vanadio 1/2\" x40 (Stanley)", sku: "SKU-STAN-D40", category: "Herramientas Manuales", price: 75.00, stock: 28, threshold: 6, lot: "L-7006", mfgDate: "2026-01-12", expDate: "2030-01-12", warehouse: "Bodega Principal", aisle: "B", shelf: 2, level: 2, pickingDistance: 15, brand: "Stanley", supplier: "Stanley Tools" },
    { id: "13", name: "Martillo de Uña Fibra de Vidrio 16oz (Truper)", sku: "SKU-TRUP-16OZ", category: "Herramientas Manuales", price: 18.50, stock: 42, threshold: 10, lot: "L-7007", mfgDate: "2026-03-08", expDate: "2031-03-08", warehouse: "Bodega Principal", aisle: "B", shelf: 3, level: 1, pickingDistance: 15, brand: "Truper", supplier: "Truper Mayorista" },
    { id: "14", name: "Flexómetro Profesional 8m Anti-impacto (Stanley)", sku: "SKU-STAN-8M", category: "Herramientas Manuales", price: 14.90, stock: 55, threshold: 12, lot: "L-7008", mfgDate: "2026-02-25", expDate: "2031-02-25", warehouse: "Bodega Principal", aisle: "A", shelf: 2, level: 1, pickingDistance: 9, brand: "Stanley", supplier: "Stanley Tools" },
    { id: "15", name: "Guantes Anticorte Nivel 5 (Caja x12 pares) (3M)", sku: "SKU-3M-GLOVE5", category: "Consumibles", price: 64.00, stock: 18, threshold: 5, lot: "L-7009", mfgDate: "2026-01-05", expDate: "2026-07-10", warehouse: "Bodega Principal", aisle: "A", shelf: 1, level: 1, pickingDistance: 7, brand: "3M", supplier: "3M Distribución" },
    { id: "16", name: "Casco de Seguridad con Ratchet (MSA V-Gard)", sku: "SKU-MSA-VGARD", category: "Consumibles", price: 32.00, stock: 30, threshold: 8, lot: "L-7010", mfgDate: "2026-02-14", expDate: "2029-02-14", warehouse: "Bodega Principal", aisle: "A", shelf: 1, level: 2, pickingDistance: 8, brand: "MSA", supplier: "MSA Safety" },
    { id: "17", name: "Lentes de Seguridad Antiempañe (Caja x20) (3M)", sku: "SKU-3M-LENS20", category: "Consumibles", price: 48.00, stock: 26, threshold: 6, lot: "L-7011", mfgDate: "2026-03-02", expDate: "2028-03-02", warehouse: "Bodega Principal", aisle: "A", shelf: 2, level: 2, pickingDistance: 9, brand: "3M", supplier: "3M Distribución" },
    { id: "18", name: "Cinta Aislante 3/4\" Negra (Pack x10) (3M Scotch)", sku: "SKU-3M-TAPE10", category: "Consumibles", price: 22.00, stock: 60, threshold: 15, lot: "L-7012", mfgDate: "2026-01-30", expDate: "2028-01-30", warehouse: "Bodega Principal", aisle: "A", shelf: 3, level: 1, pickingDistance: 10, brand: "3M", supplier: "3M Distribución" },
    { id: "19", name: "Electrodos de Soldadura 6013 1/8\" (5kg) (Lincoln Electric)", sku: "SKU-LINC-6013", category: "Consumibles", price: 38.50, stock: 9, threshold: 4, lot: "L-7013", mfgDate: "2025-12-28", expDate: "2026-06-28", warehouse: "Bodega Principal", aisle: "A", shelf: 4, level: 2, pickingDistance: 11, brand: "Lincoln Electric", supplier: "Lincoln Siderúrgica" },
    { id: "20", name: "Disco de Corte Metal 4.5\" (Caja x100) (Bosch)", sku: "SKU-BOSC-CUT100", category: "Consumibles", price: 95.00, stock: 0, threshold: 5, lot: "L-7014", mfgDate: "2025-11-10", expDate: "2027-11-10", warehouse: "Bodega Principal", aisle: "A", shelf: 5, level: 2, pickingDistance: 12, brand: "Bosch", supplier: "Bosch Latam" },
    { id: "21", name: "Tornillos Autoperforantes #8 x1\" (Caja x500) (Hilti)", sku: "SKU-HILT-SD500", category: "Fijaciones", price: 28.00, stock: 34, threshold: 8, lot: "L-7015", mfgDate: "2026-02-18", expDate: "2031-02-18", warehouse: "Bodega Principal", aisle: "C", shelf: 2, level: 1, pickingDistance: 22, brand: "Hilti", supplier: "Hilti Chile" },
    { id: "22", name: "Anclajes de Expansión 3/8\" (Caja x50) (Hilti)", sku: "SKU-HILT-EXP50", category: "Fijaciones", price: 41.00, stock: 19, threshold: 6, lot: "L-7016", mfgDate: "2026-01-08", expDate: "2031-01-08", warehouse: "Bodega Principal", aisle: "C", shelf: 3, level: 1, pickingDistance: 25, brand: "Hilti", supplier: "Hilti Chile" },
    { id: "23", name: "Tarugos Nylon 8mm (Bolsa x200) (Fischer)", sku: "SKU-FISC-N200", category: "Fijaciones", price: 12.00, stock: 48, threshold: 12, lot: "L-7017", mfgDate: "2026-03-15", expDate: "2032-03-15", warehouse: "Bodega Principal", aisle: "C", shelf: 4, level: 2, pickingDistance: 26, brand: "Fischer", supplier: "Fischer Anclajes" },
    { id: "24", name: "Pernos Hexagonales Grado 8 1/2\"x2\" (Caja x100) (Fixser)", sku: "SKU-FIXS-G8", category: "Fijaciones", price: 33.50, stock: 23, threshold: 6, lot: "L-7018", mfgDate: "2026-02-09", expDate: "2032-02-09", warehouse: "Bodega Secundaria", aisle: "C", shelf: 5, level: 1, pickingDistance: 28, brand: "Fixser", supplier: "Fixser Industrial" },
    { id: "25", name: "Generador Eléctrico a Gasolina 6500W (Honda)", sku: "SKU-HOND-6500", category: "Maquinaria Pesada", price: 1290.00, stock: 3, threshold: 1, lot: "L-7019", mfgDate: "2025-09-12", expDate: "2032-09-12", warehouse: "Bodega Secundaria", aisle: "D", shelf: 4, level: 1, pickingDistance: 36, brand: "Honda", supplier: "Honda Power Equipment" },
    { id: "26", name: "Hidrolavadora Industrial 2500PSI (Kärcher)", sku: "SKU-KARC-2500", category: "Maquinaria Pesada", price: 749.00, stock: 5, threshold: 2, lot: "L-7020", mfgDate: "2025-10-30", expDate: "2031-10-30", warehouse: "Bodega Secundaria", aisle: "D", shelf: 5, level: 1, pickingDistance: 40, brand: "Kärcher", supplier: "Kärcher Profesional" }
];

const DEMO_INVOICES = [
    {
        id: "FACT-2026-0001",
        clientName: "Juan Díaz",
        clientId: "RUT-12.845.922-K",
        date: "2026-05-28",
        items: [{ productId: "1", name: "Rotomartillo Percutor SDS-Max 1500W (Bosch)", price: 489.00, qty: 2 }],
        subtotal: 978.00,
        discountPct: 5,
        discountVal: 48.90,
        taxRate: 19,
        taxVal: 176.53,
        total: 1105.63,
        status: "paid"
    },
    {
        id: "FACT-2026-0002",
        clientName: "Constructora Andes SpA",
        clientId: "RUT-76.338.229-5",
        date: "2026-05-29",
        items: [
            { productId: "2", name: "Disco Flap de Desbaste 4.5\" G60 (Caja x50) (3M)", price: 125.00, qty: 8 },
            { productId: "3", name: "Juego de Llaves Alen de Titanio Profesional (Stanley)", price: 49.00, qty: 3 }
        ],
        subtotal: 1147.00,
        discountPct: 0,
        discountVal: 0,
        taxRate: 19,
        taxVal: 217.93,
        total: 1364.93,
        status: "paid"
    },
    {
        id: "FACT-2026-0003",
        clientName: "Metalúrgica Maipú",
        clientId: "RUT-88.321.442-9",
        date: "2026-05-30",
        items: [{ productId: "4", name: "Compresor de Aire Trifásico 3HP 100L (Kraftwerk)", price: 899.00, qty: 1 }],
        subtotal: 899.00,
        discountPct: 10,
        discountVal: 89.90,
        taxRate: 19,
        taxVal: 153.73,
        total: 962.83,
        status: "paid"
    }
];

// --- INITIALIZE APPLICATION ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadDatabase();
    updateDateDisplay();
    switchTab('dashboard');

    // Auto focus tooltip logic on trend chart
    setupChartTooltipInteraction();
});

// Update top header date representation
function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    document.getElementById("current-date-display").innerText = today.toLocaleDateString('es-ES', options);

    // Set dynamic invoice preview date
    const dateFormatted = today.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById("preview-invoice-date").innerText = dateFormatted;
}

// --- DATABASE PERSISTENCE MANAGEMENT ---
async function loadDatabase() {
    // Intentar cargar datos desde el backend; si no está disponible usa localStorage
    const [apiProducts, apiInvoices, apiSettings, apiPicking] = await Promise.all([
        apiGet('/api/products'),
        apiGet('/api/invoices'),
        apiGet('/api/settings'),
        apiGet('/api/picking')
    ]);

    // --- Productos ---
    if (apiProducts !== null && apiProducts.length > 0) {
        state.products = apiProducts;
        localStorage.setItem("aura_products", JSON.stringify(apiProducts));
    } else {
        const storedProducts = localStorage.getItem("aura_products");
        if (storedProducts) {
            state.products = JSON.parse(storedProducts);
            let updated = false;
            state.products.forEach(p => {
                if (!p.warehouse || ["Tecnología","Audio","Accesorios","Oficina"].includes(p.category)) {
                    const catMap = { "Tecnología": "Herramientas Eléctricas", "Audio": "Consumibles", "Accesorios": "Herramientas Manuales", "Oficina": "Fijaciones" };
                    if (catMap[p.category]) p.category = catMap[p.category];
                    p.warehouse = p.warehouse || "Bodega Principal";
                    p.aisle = p.aisle || "C";
                    p.shelf = p.shelf || 1;
                    p.level = p.level || 1;
                    p.pickingDistance = p.pickingDistance || 25;
                    p.brand = p.brand || "Industrial";
                    p.supplier = p.supplier || "Distribuidor Oficial";
                    updated = true;
                }
            });
            if (updated) saveProductsToStorage();
        } else {
            state.products = [...DEMO_PRODUCTS];
            saveProductsToStorage();
        }
        mergeSeedProducts();
    }

    // --- Facturas ---
    if (apiInvoices !== null) {
        state.invoices = apiInvoices;
        localStorage.setItem("aura_invoices", JSON.stringify(apiInvoices));
    } else {
        const storedInvoices = localStorage.getItem("aura_invoices");
        if (storedInvoices) {
            state.invoices = JSON.parse(storedInvoices);
        } else {
            state.invoices = [...DEMO_INVOICES];
            saveInvoicesToStorage();
        }
    }

    // --- Configuración ---
    if (apiSettings !== null) {
        state.settings = apiSettings;
        localStorage.setItem("aura_settings", JSON.stringify(apiSettings));
    } else {
        const storedSettings = localStorage.getItem("aura_settings");
        if (storedSettings) {
            state.settings = JSON.parse(storedSettings);
        } else {
            saveSettingsToStorage();
        }
    }

    // --- Picking ---
    if (apiPicking !== null) {
        state.pickingLists = apiPicking;
        localStorage.setItem("aura_picking", JSON.stringify(apiPicking));
    } else {
        loadPickingLists();
    }

    applyVisualSettings();
}

function saveProductsToStorage() {
    localStorage.setItem("aura_products", JSON.stringify(state.products));
    apiPut('/api/products', state.products);
}

// Versión del catálogo demo. Al subirla, los productos nuevos de DEMO_PRODUCTS
// se inyectan una sola vez en inventarios ya guardados, sin tocar lo existente.
const SEED_VERSION = 2;
function mergeSeedProducts() {
    const stored = parseInt(localStorage.getItem("aura_seed_version") || "1", 10);
    if (stored >= SEED_VERSION) return;

    const existingIds = new Set(state.products.map(p => p.id));
    let added = 0;
    DEMO_PRODUCTS.forEach(dp => {
        if (!existingIds.has(dp.id)) {
            state.products.push({ ...dp });
            added++;
        }
    });
    if (added > 0) saveProductsToStorage();
    localStorage.setItem("aura_seed_version", String(SEED_VERSION));
}

function saveInvoicesToStorage() {
    localStorage.setItem("aura_invoices", JSON.stringify(state.invoices));
    apiPut('/api/invoices', state.invoices);
}

function saveSettingsToStorage() {
    localStorage.setItem("aura_settings", JSON.stringify(state.settings));
    apiPut('/api/settings', state.settings);
}

function applyVisualSettings() {
    // Apply currency, name, etc. to UI
    document.getElementById("profile-company-name").innerText = state.settings.companyName;
    document.getElementById("settings-company-name").value = state.settings.companyName;
    document.getElementById("settings-company-slogan").value = state.settings.companySlogan;
    document.getElementById("settings-company-currency").value = state.settings.currency;
    document.getElementById("settings-company-tax-id").value = state.settings.taxId;

    // Update company title logo initials if element exists
    const avatarBox = document.getElementById("brand-avatar-box");
    if (avatarBox) {
        const initials = state.settings.companyName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
        avatarBox.innerText = initials;
    }

    // Update invoice subtext
    document.getElementById("invoice-corp-sub").innerText = state.settings.companySlogan;
}

function saveCompanySettings(event) {
    event.preventDefault();

    state.settings.companyName = document.getElementById("settings-company-name").value;
    state.settings.companySlogan = document.getElementById("settings-company-slogan").value;
    state.settings.currency = document.getElementById("settings-company-currency").value;
    state.settings.taxId = document.getElementById("settings-company-tax-id").value;

    const symbolMap = { "USD": "$", "EUR": "€", "CLP": "$", "MXN": "$", "COP": "$" };
    state.settings.currencySymbol = symbolMap[state.settings.currency] || "$";

    saveSettingsToStorage();
    applyVisualSettings();

    triggerToast("success", "Parámetros técnicos actualizados correctamente.");

    // Reload state across tabs
    renderDashboard();
    renderInventory();
    populateProductSelector();
    updateInvoicePreview();
}

function resetSystemDatabase() {
    if (confirm("¿Estás seguro de que deseas formatear todos los datos del sistema? Se perderán las modificaciones personalizadas y el inventario volverá a su estado base.")) {
        localStorage.removeItem("aura_products");
        localStorage.removeItem("aura_invoices");
        localStorage.removeItem("aura_settings");
        localStorage.removeItem("aura_picking");
        localStorage.removeItem("aura_seed_version");

        // Limpiar también el backend si está disponible
        const token = _apiToken();
        if (token) {
            fetch(`${API_BASE}/api/reset`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});
        }

        loadDatabase().then(() => {
            triggerToast("success", "Depósito de datos formateado al estado inicial.");
            switchTab('dashboard');
        });
    }
}

// Helper: Format price based on settings currency
function formatCurrency(amount) {
    let locales = 'en-US';
    if (state.settings.currency === 'EUR') locales = 'de-DE';
    if (state.settings.currency === 'CLP' || state.settings.currency === 'COP') locales = 'es-CL';

    return state.settings.currencySymbol + Number(amount).toLocaleString(locales, {
        minimumFractionDigits: state.settings.currency === 'CLP' || state.settings.currency === 'COP' ? 0 : 2,
        maximumFractionDigits: 2
    });
}

// --- TABS ROUTING SYSTEM ---
function switchTab(tabId) {
    state.activeTab = tabId;

    // Toggle active link class in sidebar
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });
    const activeLink = document.getElementById(`nav-${tabId}`);
    if (activeLink) activeLink.classList.add("active");

    // Toggle active view container
    document.querySelectorAll(".page-container").forEach(page => {
        page.classList.remove("active");
    });
    const activePage = document.getElementById(`${tabId}-view`);
    if (activePage) activePage.classList.add("active");

    // Update headers
    const headerTitle = document.getElementById("header-view-title");
    const headerDesc = document.getElementById("header-view-desc");

    switch (tabId) {
        case 'dashboard':
            headerTitle.innerText = "Dashboard Operativo";
            headerDesc.innerText = "Control de transacciones y estado del depósito en tiempo real.";
            renderDashboard();
            break;
        case 'inventory':
            headerTitle.innerText = "Depósito Central";
            headerDesc.innerText = "Catálogo técnico, control de garantías e inventarios críticos.";
            renderInventory();
            break;
        case 'invoicing':
            headerTitle.innerText = "Terminal de Suministro";
            headerDesc.innerText = "Despacho de mercancía y facturación instantánea de boletas.";
            // Initialize draft if empty
            if (state.invoiceItems.length === 0) {
                initializeInvoiceBuilder();
            }
            populateProductSelector();
            updateInvoicePreview();
            break;
        case 'logistics':
            headerTitle.innerText = "Optimización WMS (Pareto)";
            headerDesc.innerText = "Rotación comercial y reubicación inteligente de herramientas en estanterías.";
            renderABCView();
            break;
        case 'picking':
            headerTitle.innerText = "Preparación de Pedidos";
            headerDesc.innerText = "Recorridos de bodega, productos por recoger y despacho de pedidos en tiempo real.";
            renderPicking();
            break;
        case 'settings':
            headerTitle.innerText = "Parámetros Técnicos";
            headerDesc.innerText = "Configuraciones tributarias, moneda de operación y restablecimiento.";
            break;
    }
}

// --- TOAST NOTIFICATIONS DRIVER ---
function triggerToast(type, message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;

    let svgIcon = '';
    if (type === 'success') {
        svgIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
        svgIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else { // default info / notification
        svgIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
        ${svgIcon}
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4.5 seconds
    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// --- DASHBOARD RENDERING LOGIC ---
function renderDashboard() {
    // 1. Calculate stats metrics
    const totalRevenue = state.invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

    const totalInvoices = state.invoices.length;
    const totalStock = state.products.reduce((sum, prod) => sum + Number(prod.stock), 0);
    const totalAlerts = state.products.filter(prod => Number(prod.stock) <= Number(prod.threshold)).length;

    // 2. Write numbers to HTML
    document.getElementById("stat-revenue").innerText = formatCurrency(totalRevenue);
    document.getElementById("stat-invoice-count").innerText = totalInvoices;
    document.getElementById("stat-total-stock").innerText = totalStock;
    document.getElementById("stat-alerts").innerText = totalAlerts;

    // Modify critical alert label visual style depending on level
    const alertLabel = document.getElementById("stat-alerts-severity");
    if (totalAlerts > 0) {
        alertLabel.innerText = "Stock Crítico";
        alertLabel.className = "stat-trend down";
    } else {
        alertLabel.innerText = "Sin Alertas";
        alertLabel.className = "stat-trend up";
    }
    // 3. Render recent invoices feed
    renderRecentInvoicesFeed();

    // 4. Render weekly billing chart with real data
    renderWeeklyChart();
}

function renderRecentInvoicesFeed() {
    const listContainer = document.getElementById("dashboard-recent-invoices");
    listContainer.innerHTML = "";

    // Sort descending by date
    const sortedInvoices = [...state.invoices].slice(-4).reverse();

    if (sortedInvoices.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay registros de transacciones.</div>`;
        return;
    }

    sortedInvoices.forEach(inv => {
        const item = document.createElement("div");
        item.className = `activity-item ${inv.status === 'paid' ? 'invoice-paid' : 'invoice-pending'}`;

        let statusIcon = '';
        if (inv.status === 'paid') {
            statusIcon = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else {
            statusIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
        }

        // Format date
        const invDate = new Date(inv.date);
        const dayStr = invDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

        item.innerHTML = `
            <div class="activity-details">
                <div class="activity-icon-box">
                    ${statusIcon}
                </div>
                <div class="activity-text-info">
                    <span class="activity-title">${inv.clientName}</span>
                    <span class="activity-time">${inv.id} &bull; ${dayStr}</span>
                </div>
            </div>
            <span class="activity-value">${formatCurrency(inv.total)}</span>
        `;

        listContainer.appendChild(item);
    });
}

// --- WEEKLY BILLING CHART ENGINE ---
function generateSmoothPath(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpX = (prev.x + curr.x) / 2;
        d += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
}

function renderWeeklyChart() {
    const Y_BASE = 170;
    const Y_TOP  = 20;
    const X_POSITIONS = [40, 110, 180, 250, 320, 390, 460];
    const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const DAY_LABELS_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Get Monday of the current week
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);

    // Build date strings for this week and last week
    const thisWeekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().split('T')[0];
    });
    const lastWeekDates = thisWeekDates.map(dateStr => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });

    // Sum paid invoice totals per day
    const sumByDate = (dates) => dates.map(dateStr =>
        state.invoices
            .filter(inv => inv.date === dateStr && inv.status === 'paid')
            .reduce((sum, inv) => sum + inv.total, 0)
    );

    const dayTotals     = sumByDate(thisWeekDates);
    const lastWeekTotals = sumByDate(lastWeekDates);

    const maxVal = Math.max(...dayTotals, 1);

    // Map totals to SVG Y coordinates (higher value = lower Y number)
    const points = X_POSITIONS.map((x, i) => ({
        x,
        y: dayTotals[i] > 0
            ? Math.round(Y_BASE - ((dayTotals[i] / maxVal) * (Y_BASE - Y_TOP)))
            : Y_BASE,
        val: dayTotals[i]
    }));

    // Generate and apply paths
    const linePath = generateSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${Y_BASE} L ${points[0].x} ${Y_BASE} Z`;

    document.getElementById('chart-main-path').setAttribute('d', linePath);
    document.getElementById('chart-glow-path').setAttribute('d', linePath);
    document.getElementById('chart-area-path').setAttribute('d', areaPath);

    // Update dots position and tooltip callbacks
    const dots = document.querySelectorAll('#dashboard-trend-svg .chart-dot');
    dots.forEach((dot, i) => {
        if (i >= points.length) return;
        dot.setAttribute('cx', points[i].x);
        dot.setAttribute('cy', points[i].y);
        dot.setAttribute('data-val', points[i].val);
        dot.setAttribute('onclick',
            `showChartValue(this, '${DAY_LABELS_FULL[i]}', '${formatCurrency(points[i].val)}')`
        );
    });

    // Update X-axis day labels
    const textNodes = document.querySelectorAll('#dashboard-trend-svg text');
    textNodes.forEach((t, i) => {
        if (i < DAY_LABELS_SHORT.length) t.textContent = DAY_LABELS_SHORT[i];
    });

    // Update week range badge
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    document.getElementById('chart-legend-date').innerText = `${fmt(monday)} – ${fmt(sunday)}`;

    // Update revenue trend % vs last week
    const thisTotal = dayTotals.reduce((a, b) => a + b, 0);
    const lastTotal = lastWeekTotals.reduce((a, b) => a + b, 0);
    const trendEl = document.getElementById('stat-revenue-trend');
    if (trendEl) {
        let pctText, isUp;
        if (lastTotal > 0) {
            const pct = ((thisTotal - lastTotal) / lastTotal * 100).toFixed(1);
            isUp = Number(pct) >= 0;
            pctText = `${isUp ? '+' : ''}${pct}%`;
        } else if (thisTotal > 0) {
            isUp = true;
            pctText = '+100%';
        } else {
            isUp = true;
            pctText = '0%';
        }
        trendEl.className = `stat-trend ${isUp ? 'up' : 'down'}`;
        trendEl.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="${isUp ? '18 15 12 9 6 15' : '18 9 12 15 6 9'}" />
            </svg>
            ${pctText}`;
    }
}

// --- INTERACTIVE CHART ENGINE ---
function setupChartTooltipInteraction() {
    const chartTooltip = document.getElementById("chart-tooltip");
    const tooltipDay = document.getElementById("tooltip-day");
    const tooltipVal = document.getElementById("tooltip-val");

    window.showChartValue = function (element, day, val) {
        const rect = element.getBoundingClientRect();
        const containerRect = element.closest('.chart-container').getBoundingClientRect();

        tooltipDay.innerText = day;
        tooltipVal.innerText = val;

        // Position relative to chart-container
        chartTooltip.style.left = `${rect.left - containerRect.left - 40}px`;
        chartTooltip.style.top = `${rect.top - containerRect.top - 45}px`;
        chartTooltip.style.display = "block";

        // Light flash effect on selected dot
        document.querySelectorAll(".chart-dot").forEach(dot => {
            dot.setAttribute("r", "5");
            dot.style.fill = "var(--accent-gold)";
        });
        element.setAttribute("r", "7.5");
        element.style.fill = "var(--text-primary)";
    };

    // Close tooltip clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.classList.contains("chart-dot")) {
            chartTooltip.style.display = "none";
        }
    });
}

// --- INVENTORY MANAGEMENT DRIVER ---
let inventorySearchQuery = "";
let inventoryCategoryFilter = "all";

function renderInventory() {
    const tableBody = document.getElementById("inventory-table-body");
    tableBody.innerHTML = "";

    const filteredProducts = state.products.filter(prod => {
        const matchesSearch = prod.name.toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
            prod.sku.toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
            prod.brand.toLowerCase().includes(inventorySearchQuery.toLowerCase());
        const matchesCategory = inventoryCategoryFilter === 'all' || prod.category === inventoryCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (filteredProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem 0;">
                    No se encontraron mercancías ni herramientas registradas.
                </td>
            </tr>
        `;
        return;
    }

    filteredProducts.forEach(prod => {
        const tr = document.createElement("tr");

        // Stock status identification
        let badgeClass = 'badge-success';
        let badgeLabel = 'Operativo';
        let pct = (prod.stock / 50) * 100; // max reference 50 items
        if (pct > 100) pct = 100;

        let fillStyle = 'background: var(--accent-emerald-gradient);';

        if (Number(prod.stock) === 0) {
            badgeClass = 'badge-danger';
            badgeLabel = 'Agotado';
            fillStyle = 'background: var(--accent-rose-gradient);';
        } else if (Number(prod.stock) <= Number(prod.threshold)) {
            badgeClass = 'badge-warning';
            badgeLabel = 'Stock Crítico';
            fillStyle = 'background: var(--accent-gold-gradient);';
        }

        // Dynamic icons based on industrial category
        let categorySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
        
        if (prod.category === 'Herramientas Eléctricas') {
            categorySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`; // Lightning bolt
        } else if (prod.category === 'Consumibles') {
            categorySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`; // Grinding disc / Globe
        } else if (prod.category === 'Herramientas Manuales') {
            categorySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`; // Wrench
        } else if (prod.category === 'Fijaciones') {
            categorySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v15M10 14h4M9 9h6"/></svg>`; // Screw / Bolt
        } else if (prod.category === 'Maquinaria Pesada') {
            categorySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>`; // Machine box
        }

        // Calculate remaining shelf life / inspection in days
        let shelfLifeText = 'Sin límite';
        let shelfLifeClass = 'badge-info';
        
        if (prod.expDate) {
            const expDateObj = new Date(prod.expDate + 'T00:00:00');
            const currentDate = new Date();
            expDateObj.setHours(0,0,0,0);
            currentDate.setHours(0,0,0,0);
            
            const diffTime = expDateObj.getTime() - currentDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                shelfLifeText = `Reinspección Vencida (${Math.abs(diffDays)} d)`;
                shelfLifeClass = 'badge-danger';
            } else if (diffDays === 0) {
                shelfLifeText = 'Calibrar Hoy';
                shelfLifeClass = 'badge-warning';
            } else {
                shelfLifeText = `${diffDays} d p/inspección`;
                shelfLifeClass = diffDays <= 60 ? 'badge-warning' : 'badge-success';
            }
        }

        const fabFormatted = prod.mfgDate ? prod.mfgDate : 'N/D';
        const vencFormatted = prod.expDate ? prod.expDate : 'N/D';
        const lotFormatted = prod.lot ? prod.lot : 'N/D';

        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    <div class="product-image-placeholder">
                        ${categorySvg}
                    </div>
                    <div class="product-meta-info">
                        <span class="product-name">${prod.name}</span>
                        <span class="product-sku">${prod.sku} &bull; <strong style="color:var(--accent-gold); font-size:0.7rem;">${prod.brand}</strong></span>
                    </div>
                </div>
            </td>
            <td style="font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 0.85rem;">
                ${lotFormatted}
            </td>
            <td>
                <span style="font-weight: 600; font-family:'Rajdhani'; font-size: 0.95rem;">${prod.category}</span>
            </td>
            <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--text-primary);">
                ${formatCurrency(prod.price)}
            </td>
            <td>
                <div class="stock-bar-container">
                    <div class="stock-bar-label">
                        <span style="font-weight:700;">${prod.stock} uds</span>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">${Math.round(pct)}%</span>
                    </div>
                    <div class="stock-bar-track">
                        <div class="stock-bar-fill" style="width: ${pct}%; ${fillStyle}"></div>
                    </div>
                </div>
            </td>
            <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 1.4;">
                <div style="color: var(--text-secondary);">Rec: ${fabFormatted}</div>
                <div style="color: var(--accent-gold);">Ctrl: ${vencFormatted}</div>
            </td>
            <td>
                <span class="badge ${shelfLifeClass}">${shelfLifeText}</span>
            </td>
            <td>
                <span class="badge ${badgeClass}">${badgeLabel}</span>
            </td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-icon-only" onclick="openProductModal('${prod.id}')" title="Modificar Ficha">
                        <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                    </button>
                    <button class="btn btn-danger btn-icon-only btn-sm" onclick="deleteProduct('${prod.id}')" title="Dar de Baja">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

function filterInventory() {
    inventorySearchQuery = document.getElementById("inventory-search").value;
    inventoryCategoryFilter = document.getElementById("inventory-category-filter").value;
    renderInventory();
}

function deleteProduct(id) {
    const prod = state.products.find(p => p.id === id);
    if (!prod) return;

    if (confirm(`¿Estás seguro de que deseas dar de baja el artículo "${prod.name}" del catálogo central?`)) {
        state.products = state.products.filter(p => p.id !== id);
        saveProductsToStorage();
        renderInventory();
        triggerToast("success", `Artículo "${prod.name}" eliminado correctamente.`);
    }
}

// --- PRODUCT CREATION / EDIT MODAL LOGIC ---
function openProductModal(productId = null) {
    const modal = document.getElementById("product-modal");
    const modalTitle = document.getElementById("product-modal-title");
    const form = document.getElementById("product-form");

    form.reset();
    document.getElementById("product-modal-id").value = "";

    if (productId) {
        // Mode: EDIT
        const prod = state.products.find(p => p.id === productId);
        if (!prod) return;

        modalTitle.innerText = "Modificar Ficha Técnica del Artículo";
        document.getElementById("product-modal-id").value = prod.id;
        document.getElementById("product-modal-name").value = prod.name;
        document.getElementById("product-modal-sku").value = prod.sku;
        document.getElementById("product-modal-category").value = prod.category;
        document.getElementById("product-modal-price").value = prod.price;
        document.getElementById("product-modal-stock").value = prod.stock;
        document.getElementById("product-modal-threshold").value = prod.threshold;
        
        // Additional batch & expiry details
        document.getElementById("product-modal-lot").value = prod.lot || "";
        document.getElementById("product-modal-mfg-date").value = prod.mfgDate || "";
        document.getElementById("product-modal-exp-date").value = prod.expDate || "";

        // WMS Location & Brand fields
        document.getElementById("product-modal-warehouse").value = prod.warehouse || "Bodega Principal";
        document.getElementById("product-modal-aisle").value = prod.aisle || "C";
        document.getElementById("product-modal-shelf").value = prod.shelf || 1;
        document.getElementById("product-modal-level").value = prod.level || 1;
        document.getElementById("product-modal-distance").value = prod.pickingDistance || 25;
        document.getElementById("product-modal-brand").value = prod.brand || "";
        document.getElementById("product-modal-supplier").value = prod.supplier || "";
    } else {
        // Mode: CREATE
        modalTitle.innerText = "Registrar Nuevo Suministro Industrial";
        
        // Auto-generate cool default SKU
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        document.getElementById("product-modal-sku").value = `SKU-VF-${randomNum}`;
        
        // Auto-generate default Lot number
        const randomLot = Math.floor(100 + Math.random() * 900);
        document.getElementById("product-modal-lot").value = `LT-${randomLot}`;
        
        // Default manufacturing/reception date to today's date
        const todayStr = new Date().toISOString().split('T')[0];
        document.getElementById("product-modal-mfg-date").value = todayStr;
        
        // Default calibration inspection date to 1 year from now
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearStr = nextYear.toISOString().split('T')[0];
        document.getElementById("product-modal-exp-date").value = nextYearStr;
    }

    modal.classList.add("active");
}

function closeProductModal() {
    document.getElementById("product-modal").classList.remove("active");
}

function saveProductForm(event) {
    event.preventDefault();

    const id = document.getElementById("product-modal-id").value;
    const name = document.getElementById("product-modal-name").value;
    const sku = document.getElementById("product-modal-sku").value;
    const category = document.getElementById("product-modal-category").value;
    const price = parseFloat(document.getElementById("product-modal-price").value);
    const stock = parseInt(document.getElementById("product-modal-stock").value);
    const threshold = parseInt(document.getElementById("product-modal-threshold").value);
    
    // Read batch and expiry inputs
    const lot = document.getElementById("product-modal-lot").value;
    const mfgDate = document.getElementById("product-modal-mfg-date").value;
    const expDate = document.getElementById("product-modal-exp-date").value;

    // Read WMS location & brand inputs
    const warehouse = document.getElementById("product-modal-warehouse").value;
    const aisle = document.getElementById("product-modal-aisle").value;
    const shelf = parseInt(document.getElementById("product-modal-shelf").value) || 1;
    const level = parseInt(document.getElementById("product-modal-level").value) || 1;
    const pickingDistance = parseInt(document.getElementById("product-modal-distance").value) || 25;
    const brand = document.getElementById("product-modal-brand").value;
    const supplier = document.getElementById("product-modal-supplier").value;

    const productData = { name, sku, category, price, stock, threshold, lot, mfgDate, expDate, warehouse, aisle, shelf, level, pickingDistance, brand, supplier };

    if (id) {
        // Edit existing product
        const index = state.products.findIndex(p => p.id === id);
        if (index !== -1) {
            state.products[index] = { id, ...productData };
            triggerToast("success", `Artículo "${name}" actualizado con éxito.`);
        }
    } else {
        // Create new product
        state.products.push({ id: Date.now().toString(), ...productData });
        triggerToast("success", `Artículo "${name}" ingresado correctamente.`);
    }

    saveProductsToStorage();
    closeProductModal();
    renderInventory();
}

// --- DYNAMIC INVOICING ENGINE ---
// Reset active builder state to default draft values
function initializeInvoiceBuilder() {
    state.invoiceItems = [];

    // Inject the current proforma number dynamically
    const nextFactNum = `FACT-2026-${String(state.invoices.length + 1).padStart(4, '0')}`;
    document.getElementById("preview-invoice-number").innerText = nextFactNum;

    // Default client parameters reset
    document.getElementById("invoice-client-name").value = "Juan Díaz";
    document.getElementById("invoice-client-id").value = "RUT-12.845.922-K";

    document.getElementById("invoice-discount").value = "0";
    document.getElementById("invoice-tax-rate").value = "19";
}

function populateProductSelector() {
    const selector = document.getElementById("invoice-product-selector");
    selector.innerHTML = "";

    // Load products with stock available
    const inStock = state.products.filter(p => p.stock > 0);

    if (inStock.length === 0) {
        selector.innerHTML = `<option value="">No hay suministros disponibles (Stock Agotado)</option>`;
        return;
    }

    inStock.forEach(prod => {
        const option = document.createElement("option");
        option.value = prod.id;
        option.innerText = `${prod.name} (${formatCurrency(prod.price)} - stock: ${prod.stock})`;
        selector.appendChild(option);
    });
}

function addInvoiceItem() {
    const selector = document.getElementById("invoice-product-selector");
    const qtyInput = document.getElementById("invoice-product-qty");

    const productId = selector.value;
    const qty = parseInt(qtyInput.value);

    if (!productId || qty <= 0) {
        triggerToast("error", "Por favor selecciona un artículo y cantidad válida.");
        return;
    }

    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    // Stock boundary condition checks
    const currentQtyInBuilder = state.invoiceItems
        .filter(item => item.productId === productId)
        .reduce((sum, item) => sum + item.qty, 0);

    if (qty + currentQtyInBuilder > product.stock) {
        triggerToast("error", `Existencias insuficientes en patio. Máximo disponible: ${product.stock} uds.`);
        return;
    }

    // Check if product already exists in item builder
    const existingIndex = state.invoiceItems.findIndex(item => item.productId === productId);
    if (existingIndex !== -1) {
        state.invoiceItems[existingIndex].qty += qty;
    } else {
        state.invoiceItems.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            qty: qty
        });
    }

    qtyInput.value = "1";
    triggerToast("success", `Despachando: ${qty}x ${product.name}`);

    renderInvoiceBuilderItems();
    calculateInvoiceTotals();
}

function removeInvoiceItem(productId) {
    state.invoiceItems = state.invoiceItems.filter(item => item.productId !== productId);
    renderInvoiceBuilderItems();
    calculateInvoiceTotals();
}

function changeBuilderItemQty(productId, newQty) {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty <= 0) return;

    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    if (qty > product.stock) {
        triggerToast("error", `Existencias insuficientes. Límite: ${product.stock}`);
        renderInvoiceBuilderItems();
        return;
    }

    const index = state.invoiceItems.findIndex(item => item.productId === productId);
    if (index !== -1) {
        state.invoiceItems[index].qty = qty;
    }

    calculateInvoiceTotals();
    updateInvoicePreview();
}

function renderInvoiceBuilderItems() {
    const tbody = document.getElementById("invoice-builder-items");
    tbody.innerHTML = "";

    if (state.invoiceItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem 0;">
                    El comprobante no tiene conceptos registrados.
                </td>
            </tr>
        `;
        return;
    }

    state.invoiceItems.forEach(item => {
        const tr = document.createElement("tr");
        const itemTotal = item.price * item.qty;

        tr.innerHTML = `
            <td>
                <span style="font-weight:600; display:block; color: var(--text-primary);">${item.name}</span>
            </td>
            <td style="text-align: center;">
                <div class="quantity-control">
                    <input type="number" class="qty-input" value="${item.qty}" min="1" 
                           onchange="changeBuilderItemQty('${item.productId}', this.value)">
                </div>
            </td>
            <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;">
                ${formatCurrency(item.price)}
            </td>
            <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight:600; color:var(--text-primary); font-size: 0.9rem;">
                ${formatCurrency(itemTotal)}
            </td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-icon-only btn-sm" onclick="removeInvoiceItem('${item.productId}')" style="border-color: rgba(255,42,95,0.15); color: var(--accent-rose);">
                    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function calculateInvoiceTotals() {
    const subtotal = state.invoiceItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountPct = parseFloat(document.getElementById("invoice-discount").value);
    const discountVal = subtotal * (discountPct / 100);
    const subtotalWithDisc = subtotal - discountVal;

    const taxRate = parseFloat(document.getElementById("invoice-tax-rate").value);
    const taxVal = subtotalWithDisc * (taxRate / 100);
    const grandTotal = subtotalWithDisc + taxVal;

    // Save draft temporary totals
    state.currentCalculations = {
        subtotal,
        discountPct,
        discountVal,
        taxRate,
        taxVal,
        grandTotal
    };

    // Redraw live preview
    updateInvoicePreview();
}

function updateInvoicePreview() {
    const clientName = document.getElementById("invoice-client-name").value || "Consumidor Final";
    const clientId = document.getElementById("invoice-client-id").value || "N/A";

    document.getElementById("preview-client-name").innerText = clientName;
    document.getElementById("preview-client-id").innerText = clientId;

    const calc = state.currentCalculations || { subtotal: 0, discountPct: 0, discountVal: 0, taxRate: 19, taxVal: 0, grandTotal: 0 };

    document.getElementById("preview-subtotal").innerText = formatCurrency(calc.subtotal);
    document.getElementById("preview-discount-label").innerText = `Descuento (${calc.discountPct}%)`;
    document.getElementById("preview-discount-val").innerText = `-${formatCurrency(calc.discountVal)}`;
    document.getElementById("preview-tax-label").innerText = `I.V.A (${calc.taxRate}%)`;
    document.getElementById("preview-tax-val").innerText = formatCurrency(calc.taxVal);
    document.getElementById("preview-grand-total").innerText = formatCurrency(calc.grandTotal);

    // Render dynamic listing on ticket receipt
    const receiptItemsContainer = document.getElementById("preview-items-list");
    receiptItemsContainer.innerHTML = "";

    if (state.invoiceItems.length === 0) {
        receiptItemsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 1.75rem 0;">Esperando códigos en cinta...</div>`;
        return;
    }

    state.invoiceItems.forEach(item => {
        const row = document.createElement("div");
        row.className = "summary-item-row";
        row.innerHTML = `
            <div>
                <div class="summary-item-name">${item.name}</div>
                <div class="summary-item-qty-price">${item.qty} uds x ${formatCurrency(item.price)}</div>
            </div>
            <div class="summary-item-total">${formatCurrency(item.price * item.qty)}</div>
        `;
        receiptItemsContainer.appendChild(row);
    });
}

function commitInvoiceTransaction() {
    if (state.invoiceItems.length === 0) {
        triggerToast("error", "No se puede despachar una boleta vacía sin conceptos.");
        return;
    }

    const clientName = document.getElementById("invoice-client-name").value;
    const clientId = document.getElementById("invoice-client-id").value;

    if (!clientName.trim()) {
        triggerToast("error", "Por favor ingresa una razón social o cliente válido.");
        return;
    }

    const calc = state.currentCalculations;
    const invoiceId = document.getElementById("preview-invoice-number").innerText;
    const todayStr = new Date().toISOString().split('T')[0];

    // Create definitive invoice model
    const definitiveInvoice = {
        id: invoiceId,
        clientName,
        clientId,
        date: todayStr,
        items: [...state.invoiceItems],
        subtotal: calc.subtotal,
        discountPct: calc.discountPct,
        discountVal: calc.discountVal,
        taxRate: calc.taxRate,
        taxVal: calc.taxVal,
        total: calc.grandTotal,
        status: "paid"
    };

    // Deduct stock quantities from inventory state
    state.invoiceItems.forEach(item => {
        const productIndex = state.products.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
            state.products[productIndex].stock = Math.max(0, state.products[productIndex].stock - item.qty);
        }
    });

    // Insert into state and persist
    state.invoices.push(definitiveInvoice);
    saveInvoicesToStorage();
    saveProductsToStorage();

    // Generar automáticamente la lista de preparación de pedido (picking)
    const newList = generatePickingFromInvoice(definitiveInvoice, { silent: true });

    triggerToast("success", `Despacho ${invoiceId} procesado. Lista de preparación ${newList ? newList.id : ''} creada.`);

    // Reset invoice builder
    initializeInvoiceBuilder();
    renderInvoiceBuilderItems();
    calculateInvoiceTotals();

    // Redirect to dashboard to check transaction
    setTimeout(() => {
        switchTab('dashboard');
    }, 1200);
}

// ==========================================================================
//   ABC CLASSIFICATION & WAREHOUSE OPTIMIZATION ENGINE (PARETO)
// ==========================================================================

/**
 * Main ABC View orchestrator — called when the logistics tab is active.
 * Reads filter values, computes classification, and renders all sub-views.
 */
function renderABCView() {
    const classification = calculateABCClassification();

    // --- Update KPI stat cards ---
    const classA = classification.filter(p => p.abcClass === 'A');
    const classB = classification.filter(p => p.abcClass === 'B');
    const classC = classification.filter(p => p.abcClass === 'C');

    document.getElementById('abc-count-a').innerText = classA.length;
    document.getElementById('abc-count-b').innerText = classB.length;
    document.getElementById('abc-count-c').innerText = classC.length;

    // Revenue participation % (real Pareto metric, not product count %)
    const totalRevenue = classification.reduce((sum, p) => sum + p.salesRevenue, 0) || 1;
    document.getElementById('abc-pct-a').innerText = ((classA.reduce((s, p) => s + p.salesRevenue, 0) / totalRevenue) * 100).toFixed(1) + '%';
    document.getElementById('abc-pct-b').innerText = ((classB.reduce((s, p) => s + p.salesRevenue, 0) / totalRevenue) * 100).toFixed(1) + '%';
    document.getElementById('abc-pct-c').innerText = ((classC.reduce((s, p) => s + p.salesRevenue, 0) / totalRevenue) * 100).toFixed(1) + '%';

    // Efficiency: how many products are in the right zone?
    const misplaced = classification.filter(p => p.isMisplaced);
    const total = classification.length;
    const efficiency = total > 0 ? (((total - misplaced.length) / total) * 100).toFixed(0) : 100;
    document.getElementById('abc-warehouse-efficiency').innerText = efficiency + '%';

    const misplacedEl = document.getElementById('abc-misplaced-count');
    misplacedEl.innerText = `${misplaced.length} mal ubicados`;
    misplacedEl.className = misplaced.length > 0 ? 'stat-trend down' : 'stat-trend up';

    // --- Render sub-components ---
    renderWarehouseHeatmap(classification);
    renderParetoChart(classification);
    renderABCRecommendations(classification);
    renderABCTable(classification);
}

/**
 * Core ABC Score Calculator
 * Scores each product using weighted Pareto formula:
 *   Score = 0.40 * FrequencyNorm + 0.25 * QuantityNorm + 0.20 * RevenueNorm + 0.15 * RotationNorm
 *
 * Then classifies: top ~80% cumulative score → A, next ~15% → B, rest → C
 */
function calculateABCClassification() {
    // --- Read filter controls ---
    const warehouseFilter = document.getElementById('abc-warehouse').value;
    const categoryFilter = document.getElementById('abc-category').value;

    // Filter products
    let products = state.products.filter(p => {
        const matchWarehouse = warehouseFilter === 'all' || p.warehouse === warehouseFilter;
        const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
        return matchWarehouse && matchCategory;
    });

    if (products.length === 0) return [];

    // --- Apply period filter to invoices ---
    const periodVal = document.getElementById('abc-period').value;
    const periodDays = { semanal: 7, mensual: 30, trimestral: 90, anual: 365 };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (periodDays[periodVal] || 30));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // --- Gather sales data from invoices within the selected period ---
    const salesMap = {}; // productId → { frequency, quantity, revenue }
    state.invoices.forEach(inv => {
        if (inv.status !== 'paid') return;
        if (inv.date < cutoffStr) return;
        inv.items.forEach(item => {
            if (!salesMap[item.productId]) {
                salesMap[item.productId] = { frequency: 0, quantity: 0, revenue: 0 };
            }
            salesMap[item.productId].frequency += 1;
            salesMap[item.productId].quantity += item.qty;
            salesMap[item.productId].revenue += item.price * item.qty;
        });
    });

    // --- Compute raw metrics for each product ---
    const enriched = products.map(p => {
        const sales = salesMap[p.id] || { frequency: 0, quantity: 0, revenue: 0 };

        // Rotation index: how fast stock cycles (higher = more rotation)
        const rotation = p.stock > 0 ? (sales.quantity / p.stock) : (sales.quantity > 0 ? sales.quantity : 0);

        return {
            ...p,
            salesFrequency: sales.frequency,
            salesQuantity: sales.quantity,
            salesRevenue: sales.revenue,
            rotation: rotation
        };
    });

    // --- Normalize each metric (linear 0 → 100) ---
    const maxFreq = Math.max(...enriched.map(p => p.salesFrequency), 1);
    const maxQty = Math.max(...enriched.map(p => p.salesQuantity), 1);
    const maxRev = Math.max(...enriched.map(p => p.salesRevenue), 1);
    const maxRot = Math.max(...enriched.map(p => p.rotation), 0.01);

    enriched.forEach(p => {
        const normFreq = (p.salesFrequency / maxFreq) * 100;
        const normQty = (p.salesQuantity / maxQty) * 100;
        const normRev = (p.salesRevenue / maxRev) * 100;
        const normRot = (p.rotation / maxRot) * 100;

        // Weighted Score (Pareto)
        p.abcScore = (0.40 * normFreq) + (0.25 * normQty) + (0.20 * normRev) + (0.15 * normRot);
    });

    // --- Sort descending by Score ---
    enriched.sort((a, b) => b.abcScore - a.abcScore);

    // --- Classify using cumulative % thresholds ---
    const totalScore = enriched.reduce((sum, p) => sum + p.abcScore, 0) || 1;
    let cumulative = 0;

    enriched.forEach(p => {
        cumulative += p.abcScore;
        const cumulativePct = (cumulative / totalScore) * 100;
        p.cumulativePct = cumulativePct;

        if (cumulativePct <= 80) {
            p.abcClass = 'A';
        } else if (cumulativePct <= 95) {
            p.abcClass = 'B';
        } else {
            p.abcClass = 'C';
        }
    });

    // --- Determine misplacement in hardware store context ---
    // Class A (high rotation, e.g. Consumibles, SDS rotary hammers) should be in aisles A/B (distance ≤ 20m)
    // Class C (heavy machinery, low rotation) should be in aisles C/D (distance > 20m)
    enriched.forEach(p => {
        const dist = p.pickingDistance || 25;
        if (p.abcClass === 'A' && dist > 20) {
            p.isMisplaced = true;
            p.misplacedReason = `Artículo crítico Clase A ("${p.name.split(' ').slice(0,2).join(' ')}") ubicado a ${dist}m de despacho. Mover a zona acelerada (≤ 20m) para optimizar el picking diario.`;
            p.suggestedAisle = 'A';
        } else if (p.abcClass === 'C' && dist <= 15) {
            p.isMisplaced = true;
            p.misplacedReason = `Carga pesada/baja rotación Clase C ("${p.name.split(' ').slice(0,2).join(' ')}") ocupa espacio premium a ${dist}m. Liberar estante rápido y reubicar a pasillo lejano (> 25m).`;
            p.suggestedAisle = 'D';
        } else {
            p.isMisplaced = false;
            p.misplacedReason = '';
            p.suggestedAisle = '';
        }
    });

    return enriched;
}

/**
 * Renders the 2D warehouse floor plan heatmap.
 * 4 columns (Aisles A–D), each containing shelves.
 * Each shelf cell is color-coded by the highest-priority product stored there.
 */
function renderWarehouseHeatmap(classification) {
    const gridContainer = document.getElementById('warehouse-grid-map');
    gridContainer.innerHTML = '';

    const aisles = ['A', 'B', 'C', 'D'];
    const aisleLabels = {
        'A': 'Pasillo A · EPP y Consumibles',
        'B': 'Pasillo B · Bahía Herramientas',
        'C': 'Pasillo C · Bahía Fijaciones',
        'D': 'Pasillo D · Patio Carga Pesada'
    };

    aisles.forEach(aisleId => {
        const aisleColumn = document.createElement('div');
        aisleColumn.className = 'warehouse-aisle-column';

        // Aisle header
        aisleColumn.innerHTML = `<div class="warehouse-aisle-header">${aisleLabels[aisleId]}</div>`;

        // Shelves container
        const shelvesContainer = document.createElement('div');
        shelvesContainer.className = 'warehouse-shelves-container';

        // Find all products in this aisle
        const aisleProducts = classification.filter(p => p.aisle === aisleId);

        // Group by shelf number
        const shelfMap = {};
        aisleProducts.forEach(p => {
            const key = p.shelf || 1;
            if (!shelfMap[key]) shelfMap[key] = [];
            shelfMap[key].push(p);
        });

        // Render up to 5 shelf slots per aisle
        const maxShelves = 5;
        for (let s = 1; s <= maxShelves; s++) {
            const slot = document.createElement('div');
            slot.className = 'warehouse-rack-slot';

            const productsOnShelf = shelfMap[s] || [];

            if (productsOnShelf.length === 0) {
                slot.classList.add('slot-empty');
                slot.innerHTML = `<span class="rack-slot-meta">Bahía ${s} · Libre</span>`;
            } else {
                // Use highest priority (A > B > C) product to color the slot
                const priorityOrder = { 'A': 0, 'B': 1, 'C': 2 };
                productsOnShelf.sort((a, b) => priorityOrder[a.abcClass] - priorityOrder[b.abcClass]);
                const primary = productsOnShelf[0];

                slot.classList.add(`slot-class-${primary.abcClass.toLowerCase()}`);

                // Check misplacement
                if (productsOnShelf.some(p => p.isMisplaced)) {
                    slot.classList.add('slot-misplaced');
                }

                // Slot visual content
                const productNames = productsOnShelf.map(p => p.name.split(' ').slice(0, 2).join(' ')).join(', ');
                slot.innerHTML = `
                    <span class="rack-slot-title">Clase ${primary.abcClass}</span>
                    <span class="rack-slot-meta">${productsOnShelf.length} SKU${productsOnShelf.length > 1 ? 's' : ''} &bull; Bahía ${s}</span>
                    <div class="rack-tooltip">
                        <h4>Estantería ${aisleId}${s}</h4>
                        ${productsOnShelf.map(p => `
                            <p><strong style="color: var(--text-primary);">${p.name}</strong></p>
                            <p>Clase: <strong>${p.abcClass}</strong> &bull; Score ABC: <strong>${p.abcScore.toFixed(1)}</strong></p>
                            <p>Distancia: ${p.pickingDistance}m ${p.isMisplaced ? '⚠️ Desalineado' : '✅ Correcto'}</p>
                        `).join('<hr style="border-color: rgba(255,107,0,0.15); margin: 0.4rem 0;">')}
                    </div>
                `;
            }

            shelvesContainer.appendChild(slot);
        }

        aisleColumn.appendChild(shelvesContainer);
        gridContainer.appendChild(aisleColumn);
    });

    // Update warehouse label
    const warehouseFilter = document.getElementById('abc-warehouse').value;
    document.getElementById('heatmap-warehouse-label').innerText = warehouseFilter === 'all' ? 'Todos los Depósitos' : warehouseFilter;
}

/**
 * Renders the Pareto SVG chart with:
 * - Colored bars (green=A, blue=B, red=C) showing individual scores
 * - Cumulative % line overlay
 * - 80%/95% threshold lines
 */
function renderParetoChart(classification) {
    const svg = document.getElementById('abc-pareto-svg');
    svg.innerHTML = '';

    if (classification.length === 0) {
        svg.innerHTML = `<text x="250" y="140" fill="var(--text-muted)" font-size="14" text-anchor="middle">No hay suficientes transacciones para el gráfico de Pareto.</text>`;
        return;
    }

    const viewWidth = 500;
    const viewHeight = 280;
    const padding = { top: 30, right: 55, bottom: 40, left: 55 };
    const chartW = viewWidth - padding.left - padding.right;
    const chartH = viewHeight - padding.top - padding.bottom;

    // Acumulamos todo el markup en un string y lo asignamos UNA sola vez al final
    // (evita reparsear el SVG completo en cada concatenación — mucho más rápido)
    let svgParts = '';

    const maxScore = Math.max(...classification.map(p => p.abcScore), 1);
    const n = classification.length;
    const barGap = 4;
    const barWidth = Math.max(8, Math.min(50, (chartW - barGap * n) / n));

    // --- Draw grid lines ---
    for (let pct = 0; pct <= 100; pct += 25) {
        const y = padding.top + chartH - (pct / 100) * chartH;
        svgParts +=`<line class="pareto-axis" x1="${padding.left}" y1="${y}" x2="${viewWidth - padding.right}" y2="${y}" />`;
        svgParts +=`<text class="pareto-label" x="${padding.left - 8}" y="${y + 3}" text-anchor="end">${pct}%</text>`;
    }

    // --- Draw 80% and 95% threshold horizontal dashed lines ---
    const y80 = padding.top + chartH - (80 / 100) * chartH;
    const y95 = padding.top + chartH - (95 / 100) * chartH;
    svgParts += `<line x1="${padding.left}" y1="${y80}" x2="${viewWidth - padding.right}" y2="${y80}" stroke="var(--accent-emerald)" stroke-width="1.2" stroke-dasharray="5,4" opacity="0.6" />`;
    svgParts += `<text x="${viewWidth - padding.right + 4}" y="${y80 + 3}" fill="var(--accent-emerald)" font-size="9" font-weight="700">80%</text>`;
    svgParts += `<line x1="${padding.left}" y1="${y95}" x2="${viewWidth - padding.right}" y2="${y95}" stroke="var(--accent-cyan)" stroke-width="1.2" stroke-dasharray="5,4" opacity="0.6" />`;
    svgParts += `<text x="${viewWidth - padding.right + 4}" y="${y95 + 3}" fill="var(--accent-cyan)" font-size="9" font-weight="700">95%</text>`;

    // --- Draw bars and build line points ---
    let linePoints = [];
    let dotElements = '';

    classification.forEach((p, i) => {
        const x = padding.left + i * (barWidth + barGap) + barGap / 2;
        const barH = (p.abcScore / maxScore) * chartH;
        const barY = padding.top + chartH - barH;

        const classColor = p.abcClass === 'A' ? 'bar-class-a' : p.abcClass === 'B' ? 'bar-class-b' : 'bar-class-c';

        svgParts +=`<rect class="pareto-bar ${classColor}" x="${x}" y="${barY}" width="${barWidth}" height="${barH}" rx="3">
            <title>${p.name}\nScore ABC: ${p.abcScore.toFixed(1)} &bull; Clase ${p.abcClass}</title>
        </rect>`;

        // X-axis label (truncated name)
        const shortName = p.name.split(' ').slice(0, 1).join('').substring(0, 6);
        svgParts +=`<text class="pareto-label" x="${x + barWidth / 2}" y="${viewHeight - padding.bottom + 15}" text-anchor="middle" font-size="8">${shortName}</text>`;

        // Cumulative line point
        const lineY = padding.top + chartH - (p.cumulativePct / 100) * chartH;
        const lineX = x + barWidth / 2;
        linePoints.push(`${lineX},${lineY}`);

        dotElements += `<circle class="pareto-line-dot" cx="${lineX}" cy="${lineY}" r="4">
            <title>${p.name} &bull; Acumulado: ${p.cumulativePct.toFixed(1)}%</title>
        </circle>`;
    });

    // --- Draw cumulative line ---
    if (linePoints.length > 1) {
        svgParts +=`<polyline class="pareto-line" points="${linePoints.join(' ')}" />`;
    }
    svgParts += dotElements;

    // --- Axis labels ---
    svgParts += `<text x="${viewWidth / 2}" y="${viewHeight - 5}" fill="var(--text-muted)" font-size="10" text-anchor="middle" font-weight="700">Artículos (Ordenados por rotación)</text>`;
    svgParts += `<text x="12" y="${viewHeight / 2}" fill="var(--text-muted)" font-size="10" text-anchor="middle" transform="rotate(-90 12 ${viewHeight / 2})" font-weight="700">% Acumulado</text>`;

    // Asignación única — un solo reflow en lugar de ~30
    svg.innerHTML = svgParts;
}

/**
 * Renders intelligent relocation recommendation cards.
 * Only shows products that are misplaced.
 */
function renderABCRecommendations(classification) {
    const container = document.getElementById('abc-recommendations-list');
    container.innerHTML = '';

    const misplaced = classification.filter(p => p.isMisplaced);

    if (misplaced.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="var(--accent-emerald)" stroke-width="2" fill="none" style="margin-bottom: 1rem;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.35rem; font-family:'Syne';">Bahías Optimizadas</p>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">Todas las herramientas y cargas están en su pasillo óptimo.</p>
            </div>
        `;
        return;
    }

    misplaced.forEach(p => {
        const card = document.createElement('div');
        card.className = 'abc-recommendation-card';

        const tagClass = p.abcClass === 'A' ? 'tag-high' : 'tag-low';
        const tagLabel = p.abcClass === 'A' ? 'Acelerado / Clase A' : 'Bajo Rotación / Clase C';

        const arrowSvg = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

        card.innerHTML = `
            <div class="abc-rec-header">
                <span class="abc-rec-tag ${tagClass}">${tagLabel}</span>
                <span style="font-family: 'JetBrains Mono'; font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Score: ${p.abcScore.toFixed(1)}</span>
            </div>
            <div class="abc-rec-product-name">${p.name}</div>
            <div class="abc-rec-desc">${p.misplacedReason}</div>
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; font-weight: 700; color: var(--accent-gold); margin-top: 0.25rem; font-family:'Rajdhani'; text-transform:uppercase;">
                ${arrowSvg}
                <span>Mover de Pasillo ${p.aisle} &rarr; Bahía ${p.suggestedAisle}</span>
            </div>
        `;

        container.appendChild(card);
    });
}

/**
 * Renders the full ABC analytics data table.
 */
function renderABCTable(classification) {
    const tbody = document.getElementById('abc-table-body');
    tbody.innerHTML = '';

    if (classification.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 3rem 0;">
                    No se encontraron datos de rotación.
                </td>
            </tr>
        `;
        return;
    }

    classification.forEach(p => {
        const tr = document.createElement('tr');

        // Class badge color
        const classBadgeMap = {
            'A': 'badge-success',
            'B': 'badge-info',
            'C': 'badge-danger'
        };

        // Relocation status
        let relocateCell = '';
        if (p.isMisplaced) {
            relocateCell = `<span class="badge badge-danger" style="cursor: help;" title="${p.misplacedReason}">⚠️ Ajustar &rarr; Pasillo ${p.suggestedAisle}</span>`;
        } else {
            relocateCell = `<span class="badge badge-success">✅ OK</span>`;
        }

        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    <div class="product-meta-info">
                        <span class="product-name">${p.name}</span>
                        <span class="product-sku">${p.sku} &bull; <strong style="color:var(--text-muted);">${p.brand}</strong></span>
                    </div>
                </div>
            </td>
            <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600;">
                ${p.salesQuantity}
            </td>
            <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--text-primary);">
                ${formatCurrency(p.salesRevenue)}
            </td>
            <td style="text-align: center;">
                <span style="font-family: 'JetBrains Mono'; font-size: 0.8rem; font-weight:600;">Pasillo ${p.aisle} &bull; E${p.shelf}</span>
            </td>
            <td style="text-align: right; font-family: 'JetBrains Mono', monospace;">
                ${p.pickingDistance}m
            </td>
            <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--accent-gold);">
                ${p.abcScore.toFixed(1)}
            </td>
            <td>
                <span class="badge ${classBadgeMap[p.abcClass]}">Clase ${p.abcClass}</span>
            </td>
            <td style="text-align: right;">
                ${relocateCell}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * Exports the current ABC classification data to a downloadable CSV file.
 */
function exportToCSV() {
    const classification = calculateABCClassification();

    if (classification.length === 0) {
        triggerToast('error', 'No hay datos de rotación para exportar.');
        return;
    }

    const headers = ['Producto', 'SKU', 'Categoría', 'Ventas (uds)', 'Ingresos', 'Bahia Almacenamiento', 'Pasillo', 'Estante', 'Distancia Picking (m)', 'Score ABC', 'Clase', 'Requiere Traslado', 'Accion Recomendada'];

    const rows = classification.map(p => [
        `"${p.name}"`,
        p.sku,
        p.category,
        p.salesQuantity,
        p.salesRevenue.toFixed(2),
        `"${p.warehouse}"`,
        p.aisle,
        p.shelf,
        p.pickingDistance,
        p.abcScore.toFixed(2),
        p.abcClass,
        p.isMisplaced ? 'Sí' : 'No',
        p.isMisplaced ? `Trasladar a Pasillo ${p.suggestedAisle}` : 'Sin cambios'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `VULCAN_Clasificacion_ABC_${dateStr}.csv`;
    link.click();

    triggerToast('success', `Planilla ABC exportada correctamente (${classification.length} productos).`);
}

// ==========================================================================
//   MÓDULO: PREPARACIÓN DE PEDIDOS (PICKING INTELIGENTE)
//   Recorrido de bodega · productos por vencer · stock comprometido
// ==========================================================================

// --- Catálogo de estados (lenguaje simple para operarios) ---
const PICKING_STATUS = {
    pendiente:  { label: 'Pendiente',   badge: 'badge-warning', dot: 'var(--accent-gold)',    next: 'Iniciar preparación' },
    en_proceso: { label: 'Preparando',  badge: 'badge-info',    dot: 'var(--accent-cyan)',    next: 'Finalizar' },
    parcial:    { label: 'Incompleto',  badge: 'badge-warning', dot: 'var(--accent-gold)',    next: 'Despachar parcial' },
    completado: { label: 'Listo',       badge: 'badge-success', dot: 'var(--accent-emerald)', next: 'Despachar' },
    despachado: { label: 'Despachado',  badge: 'badge-success', dot: 'var(--accent-emerald)', next: '' },
    cancelado:  { label: 'Cancelado',   badge: 'badge-danger',  dot: 'var(--accent-rose)',    next: '' }
};

const PICKING_PRIORITY = {
    alta:  { label: 'Urgente', badge: 'badge-danger' },
    media: { label: 'Normal',  badge: 'badge-info' },
    baja:  { label: 'Sin prisa', badge: 'badge-success' }
};

// Orden físico de pasillos (cercano → lejano al muelle de despacho)
const AISLE_ORDER = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };

const PICKING_SUB_META = {
    panel:      { title: 'Resumen', desc: 'Indicadores de preparación de pedidos.' },
    nueva:      { title: 'Nueva lista', desc: 'Pedidos listos para preparar.' },
    proceso:    { title: 'En preparación', desc: 'Pedidos que se están recogiendo ahora.' },
    completado: { title: 'Preparados', desc: 'Pedidos listos o ya despachados.' },
    comprometido:{ title: 'Stock comprometido', desc: 'Unidades reservadas por pedidos en curso.' },
    pendientes: { title: 'Productos pendientes', desc: 'Lo que aún falta por recoger.' },
    historial:  { title: 'Historial', desc: 'Registro de movimientos y cambios.' }
};

const PICKING_SESSION = (typeof getVulcanSession === 'function' && getVulcanSession()) || null;

// --- Persistencia ---
function savePickingToStorage() {
    localStorage.setItem('aura_picking', JSON.stringify(state.pickingLists));
    apiPut('/api/picking', state.pickingLists);
}

function loadPickingLists() {
    const stored = localStorage.getItem('aura_picking');
    if (stored) {
        try { state.pickingLists = JSON.parse(stored); } catch (e) { state.pickingLists = []; }
    } else {
        seedPickingDemo();
        savePickingToStorage();
    }
    syncPickingWithInvoices();
}

// Genera listas de picking para todas las facturas que todavía no tienen una.
// Se ejecuta al arrancar y cada vez que se carga el módulo, sin sobrescribir
// listas existentes. Silencioso: no muestra toasts ni redirige.
function syncPickingWithInvoices() {
    const withList = new Set(state.pickingLists.map(l => l.orderRef));
    let added = 0;
    state.invoices.forEach(inv => {
        if (withList.has(inv.id)) return;
        if (!inv.items || inv.items.length === 0) return;
        const items = inv.items.map(line => {
            const product = state.products.find(p => p.id === line.productId);
            if (product) return buildPickItem(product, line.qty);
            return {
                productId: line.productId, name: line.name, sku: '—', category: '—',
                requestedQty: line.qty, pickedQty: 0, picked: false, status: 'pendiente',
                warehouse: '', aisle: '', shelf: 0, level: 0, pickingDistance: 99,
                location: '', lot: '', expDate: '', lots: [], stockSnapshot: 0
            };
        });
        const ordered = sortByRoute(items);
        state.pickingLists.push({
            id: nextPickingId(),
            orderRef: inv.id,
            type: 'Factura',
            clientName: inv.clientName,
            clientId: inv.clientId,
            date: inv.date || new Date().toISOString().split('T')[0],
            createdAt: Date.now(),
            status: 'pendiente',
            operator: 'Sin asignar',
            priority: 'media',
            estimatedSec: estimatePickingTime(ordered),
            startedAt: null,
            finishedAt: null,
            items: ordered,
            history: [{ ts: Date.now(), action: 'Creada', detail: `Sincronizada desde ${inv.id}`, by: 'Sistema' }]
        });
        withList.add(inv.id);
        added++;
    });
    if (added > 0) savePickingToStorage();
}

// --- Helpers de ubicación / formato ---
function pad2(n) { return String(n).padStart(2, '0'); }

function buildLocationCode(p) {
    if (!p || !p.aisle) return '';
    return `${p.aisle}-${pad2(p.shelf || 1)}-${pad2(p.level || 1)}`;
}

function zoneLabel(aisle) {
    const zones = {
        'A': 'Zona Rápida',
        'B': 'Zona Media',
        'C': 'Zona Profunda',
        'D': 'Patio Lejano'
    };
    return zones[aisle] || 'Sin zona';
}

function formatDuration(sec) {
    if (!sec || sec < 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${pad2(s)}s`;
}

function daysToExpiry(expDate) {
    if (!expDate) return null;
    const exp = new Date(expDate + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// --- LÓGICA "PRIMERO EN VENCER, PRIMERO EN SALIR" ---
// Devuelve los lotes de un producto ordenados por fecha de vencimiento (más próximo primero).
function getProductLots(product) {
    if (product.lots && product.lots.length) {
        return [...product.lots].sort((a, b) => (a.expDate || '').localeCompare(b.expDate || ''));
    }
    // Si el producto sólo trae un lote, generamos lotes de demostración para
    // mostrar visualmente cómo el sistema elige el que vence primero.
    const stock = Math.max(Number(product.stock) || 0, 1);
    const base = product.expDate ? new Date(product.expDate + 'T00:00:00') : new Date();
    const mk = (offsetDays, frac, suffix) => {
        const d = new Date(base);
        d.setDate(d.getDate() + offsetDays);
        return {
            code: `${product.lot || 'LT'}-${suffix}`,
            expDate: d.toISOString().split('T')[0],
            qty: Math.max(1, Math.round(stock * frac))
        };
    };
    return [mk(-35, 0.35, 'A'), mk(0, 0.40, 'B'), mk(55, 0.25, 'C')]
        .sort((a, b) => a.expDate.localeCompare(b.expDate));
}

function selectFEFOLot(product) {
    const lots = getProductLots(product);
    return lots[0] || null;
}

// --- Recorrido óptimo: ordena los productos por cercanía dentro de la bodega ---
function sortByRoute(items) {
    return [...items].sort((a, b) => {
        const az = AISLE_ORDER[a.aisle] || 9;
        const bz = AISLE_ORDER[b.aisle] || 9;
        if (az !== bz) return az - bz;
        if ((a.shelf || 0) !== (b.shelf || 0)) return (a.shelf || 0) - (b.shelf || 0);
        return (a.pickingDistance || 0) - (b.pickingDistance || 0);
    });
}

// Tiempo estimado de preparación (segundos): base por línea + caminata por distancia
function estimatePickingTime(items) {
    let sec = 0;
    items.forEach(it => {
        sec += 25;                          // tomar y validar el producto
        sec += (it.requestedQty || 1) * 4;  // por cada unidad
        sec += (it.pickingDistance || 10) * 1.5; // caminata ida/vuelta
    });
    return Math.round(sec);
}

// --- STOCK COMPROMETIDO ---
// Unidades reservadas por pedidos activos (pendientes / en preparación / incompletos)
function getCommittedStock(productId) {
    let committed = 0;
    state.pickingLists.forEach(list => {
        if (!['pendiente', 'en_proceso', 'parcial'].includes(list.status)) return;
        list.items.forEach(it => {
            if (it.productId === productId) {
                committed += Math.max(0, (it.requestedQty || 0) - (it.pickedQty || 0));
            }
        });
    });
    return committed;
}

function getAvailableStock(productId) {
    const prod = state.products.find(p => p.id === productId);
    if (!prod) return 0;
    return Math.max(0, Number(prod.stock) - getCommittedStock(productId));
}

// --- ID incremental de lista ---
function nextPickingId() {
    let max = 0;
    state.pickingLists.forEach(l => {
        const m = /PICK-\d{4}-(\d+)/.exec(l.id);
        if (m) max = Math.max(max, parseInt(m[1]));
    });
    return `PICK-2026-${String(max + 1).padStart(4, '0')}`;
}

// --- Construir item de picking a partir de un producto + cantidad ---
function buildPickItem(product, qty) {
    const fefo = selectFEFOLot(product);
    return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        requestedQty: qty,
        pickedQty: 0,
        picked: false,
        status: 'pendiente',
        warehouse: product.warehouse || 'Bodega Principal',
        aisle: product.aisle || '',
        shelf: product.shelf || 1,
        level: product.level || 1,
        pickingDistance: product.pickingDistance || 15,
        location: buildLocationCode(product),
        lot: fefo ? fefo.code : (product.lot || ''),
        expDate: fefo ? fefo.expDate : (product.expDate || ''),
        lots: getProductLots(product),
        stockSnapshot: Number(product.stock) || 0
    };
}

// --- GENERACIÓN AUTOMÁTICA DESDE FACTURA / PEDIDO / ORDEN ---
function generatePickingFromInvoice(invoice, opts = {}) {
    if (!invoice || !invoice.items || invoice.items.length === 0) return null;

    const items = invoice.items.map(line => {
        const product = state.products.find(p => p.id === line.productId);
        if (product) return buildPickItem(product, line.qty);
        // Producto que ya no está en catálogo
        return {
            productId: line.productId, name: line.name, sku: '—', category: '—',
            requestedQty: line.qty, pickedQty: 0, picked: false, status: 'pendiente',
            warehouse: '', aisle: '', shelf: 0, level: 0, pickingDistance: 99,
            location: '', lot: '', expDate: '', lots: [], stockSnapshot: 0
        };
    });

    const ordered = sortByRoute(items);
    const list = {
        id: nextPickingId(),
        orderRef: invoice.id,
        type: 'Factura',
        clientName: invoice.clientName,
        clientId: invoice.clientId,
        date: invoice.date || new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        status: 'pendiente',
        operator: 'Sin asignar',
        priority: 'media',
        estimatedSec: estimatePickingTime(ordered),
        startedAt: null,
        finishedAt: null,
        items: ordered,
        history: [{ ts: Date.now(), action: 'Creada', detail: `Generada desde ${invoice.id}`, by: 'Sistema' }]
    };

    state.pickingLists.push(list);
    savePickingToStorage();

    if (!opts.silent) {
        triggerToast('success', `Lista de preparación ${list.id} creada para ${list.clientName}.`);
        if (state.activeTab === 'picking') renderPicking();
    }
    return list;
}

// --- Datos de demostración (para que el módulo no aparezca vacío) ---
function seedPickingDemo() {
    state.pickingLists = [];
    const sources = (state.invoices && state.invoices.length) ? state.invoices : [];
    sources.forEach((inv, idx) => {
        const list = generatePickingFromInvoice(inv, { silent: true });
        if (!list) return;

        if (idx === 0) {
            // Pedido ya despachado (todo recogido)
            list.operator = 'Jefe de Depósito';
            list.priority = 'media';
            list.status = 'despachado';
            list.startedAt = list.createdAt + 60000;
            list.finishedAt = list.startedAt + 185000;
            list.items.forEach(it => { it.pickedQty = it.requestedQty; it.picked = true; it.status = 'recogido'; });
            list.history.push({ ts: list.finishedAt, action: 'Despachado', detail: 'Pedido entregado a transporte', by: 'Jefe de Depósito' });
        } else if (idx === 1) {
            // Pedido en preparación (a medias)
            list.operator = 'Jefe de Depósito';
            list.priority = 'alta';
            list.status = 'en_proceso';
            list.startedAt = Date.now() - 140000;
            if (list.items[0]) { list.items[0].pickedQty = list.items[0].requestedQty; list.items[0].picked = true; list.items[0].status = 'recogido'; }
            list.history.push({ ts: list.startedAt, action: 'Iniciada', detail: 'Comenzó la preparación', by: 'Jefe de Depósito' });
        } else {
            // Pedido pendiente sin asignar
            list.priority = 'baja';
            list.status = 'pendiente';
        }
    });
    savePickingToStorage();
}

// ==========================================================================
//   RENDER PRINCIPAL DEL MÓDULO
// ==========================================================================
function renderPicking() {
    // Marcar sub-pestaña activa
    document.querySelectorAll('.picking-subtab').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`picksub-${state.activePickingSub}`);
    if (activeBtn) activeBtn.classList.add('active');

    renderPickingAlerts();

    const sub = state.activePickingSub;
    switch (sub) {
        case 'panel': renderPickingPanel(); break;
        case 'nueva': renderPickingNew(); break;
        case 'proceso': renderPickingActive(); break;
        case 'completado': renderPickingCompleted(); break;
        case 'comprometido': renderCommittedStock(); break;
        case 'pendientes': renderPendingProducts(); break;
        case 'historial': renderPickingHistory(); break;
        default: renderPickingPanel();
    }
}

function switchPickingSub(sub) {
    state.activePickingSub = sub;
    renderPicking();
}

// --- Badge de cantidad en cada sub-pestaña ---
function refreshPickingTabCounts() {
    const counts = {
        nueva: state.invoices.filter(inv => !state.pickingLists.some(l => l.orderRef === inv.id)).length,
        proceso: state.pickingLists.filter(l => ['pendiente', 'en_proceso', 'parcial'].includes(l.status)).length,
        completado: state.pickingLists.filter(l => ['completado', 'despachado'].includes(l.status)).length
    };
    Object.entries(counts).forEach(([k, v]) => {
        const el = document.getElementById(`pickcount-${k}`);
        if (el) { el.innerText = v; el.style.display = v > 0 ? 'inline-flex' : 'none'; }
    });
}

// ==========================================================================
//   ALERTAS AUTOMÁTICAS
// ==========================================================================
function computePickingAlerts() {
    const alerts = [];
    const seen = new Set();

    state.pickingLists.forEach(list => {
        if (!['pendiente', 'en_proceso', 'parcial'].includes(list.status)) return;

        list.items.forEach(it => {
            const remaining = (it.requestedQty || 0) - (it.pickedQty || 0);
            if (remaining <= 0) return;

            // Stock insuficiente
            const prod = state.products.find(p => p.id === it.productId);
            const phys = prod ? Number(prod.stock) : 0;
            if (phys < it.requestedQty) {
                const key = 'stock-' + it.productId;
                if (!seen.has(key)) {
                    seen.add(key);
                    alerts.push({ type: 'danger', icon: 'alert', msg: `Stock insuficiente: ${it.name.split(' ').slice(0, 3).join(' ')} (pide ${it.requestedQty}, hay ${phys}).` });
                }
            }

            // Producto sin ubicación
            if (!it.aisle) {
                const key = 'loc-' + it.productId;
                if (!seen.has(key)) {
                    seen.add(key);
                    alerts.push({ type: 'warning', icon: 'pin', msg: `Producto sin ubicación: ${it.name.split(' ').slice(0, 3).join(' ')}.` });
                }
            }

            // Producto por vencer
            const d = daysToExpiry(it.expDate);
            if (d !== null && d <= 30) {
                const key = 'exp-' + it.productId;
                if (!seen.has(key)) {
                    seen.add(key);
                    const txt = d < 0 ? 'vencido' : `vence en ${d} día${d === 1 ? '' : 's'}`;
                    alerts.push({ type: d < 0 ? 'danger' : 'warning', icon: 'clock', msg: `Producto por vencer: ${it.name.split(' ').slice(0, 3).join(' ')} (${txt}).` });
                }
            }
        });

        // Preparación detenida (iniciada hace mucho sin terminar)
        if (list.status === 'en_proceso' && list.startedAt && (Date.now() - list.startedAt) > 30 * 60 * 1000) {
            alerts.push({ type: 'warning', icon: 'pause', msg: `Preparación detenida: ${list.id} lleva mucho tiempo sin avanzar.` });
        }
    });

    return alerts;
}

function renderPickingAlerts() {
    const container = document.getElementById('picking-alerts');
    if (!container) return;
    refreshPickingTabCounts();

    const alerts = computePickingAlerts();
    if (alerts.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    container.innerHTML = alerts.slice(0, 6).map(a => `
        <div class="picking-alert-chip alert-${a.type}">
            ${pickIcon(a.icon)}
            <span>${a.msg}</span>
        </div>
    `).join('');
}

// --- Iconos SVG reutilizables ---
function pickIcon(name) {
    const icons = {
        alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
    };
    return icons[name] || '';
}

// --- Cálculo de progreso de una lista ---
function listProgress(list) {
    const itemsTotal = list.items.length;
    let itemsDone = 0, totalReq = 0, totalPicked = 0;
    list.items.forEach(it => {
        totalReq += it.requestedQty || 0;
        totalPicked += it.pickedQty || 0;
        if ((it.pickedQty || 0) >= (it.requestedQty || 0)) itemsDone++;
    });
    const pct = totalReq > 0 ? Math.round((totalPicked / totalReq) * 100) : 0;
    return { itemsTotal, itemsDone, totalReq, totalPicked, pct, remainingUnits: totalReq - totalPicked, remainingItems: itemsTotal - itemsDone };
}

function elapsedSeconds(list) {
    if (!list.startedAt) return 0;
    const end = list.finishedAt || Date.now();
    return Math.round((end - list.startedAt) / 1000);
}

// ==========================================================================
//   SUB-VISTA: PANEL / RESUMEN
// ==========================================================================
function renderPickingPanel() {
    const c = document.getElementById('picking-content');
    const lists = state.pickingLists;

    const pendientes = lists.filter(l => ['pendiente', 'en_proceso', 'parcial'].includes(l.status)).length;
    const completados = lists.filter(l => ['completado', 'despachado'].includes(l.status)).length;
    const parciales = lists.filter(l => l.status === 'parcial').length;

    // Tiempo promedio de preparación
    const timed = lists.filter(l => l.startedAt && l.finishedAt);
    const avgSec = timed.length ? Math.round(timed.reduce((s, l) => s + elapsedSeconds(l), 0) / timed.length) : 0;

    // Eficiencia operativa: % de unidades recogidas sobre solicitadas en pedidos finalizados
    let reqF = 0, pickF = 0;
    lists.filter(l => ['completado', 'despachado', 'parcial'].includes(l.status)).forEach(l => {
        const p = listProgress(l); reqF += p.totalReq; pickF += p.totalPicked;
    });
    const efficiency = reqF > 0 ? Math.round((pickF / reqF) * 100) : 100;

    // Productividad por operario (unidades recogidas)
    const opMap = {};
    lists.forEach(l => {
        if (l.operator && l.operator !== 'Sin asignar') {
            opMap[l.operator] = (opMap[l.operator] || 0) + listProgress(l).totalPicked;
        }
    });
    const opRows = Object.entries(opMap).map(([k, v]) => ({ label: k, value: v }));

    // Movimientos por zona
    const zoneMap = {};
    lists.forEach(l => l.items.forEach(it => {
        const z = it.aisle ? `Pasillo ${it.aisle}` : 'Sin zona';
        zoneMap[z] = (zoneMap[z] || 0) + (it.pickedQty || 0);
    }));
    const zoneRows = Object.entries(zoneMap).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ label: k, value: v }));

    // Productos con mayor movimiento
    const moveMap = {};
    lists.forEach(l => l.items.forEach(it => {
        moveMap[it.name] = (moveMap[it.name] || 0) + (it.pickedQty || 0);
    }));
    const topMoved = Object.entries(moveMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ label: k, value: v }));

    // Productos por vencer (en pedidos activos)
    const expiring = [];
    const seenExp = new Set();
    lists.filter(l => ['pendiente', 'en_proceso', 'parcial'].includes(l.status)).forEach(l => l.items.forEach(it => {
        const d = daysToExpiry(it.expDate);
        if (d !== null && d <= 60 && !seenExp.has(it.productId)) {
            seenExp.add(it.productId);
            expiring.push({ name: it.name, days: d, lot: it.lot });
        }
    }));
    expiring.sort((a, b) => a.days - b.days);

    c.innerHTML = `
        <div class="stats-grid">
            ${pickStatCard('gold', 'Pedidos por preparar', pendientes, pickIcon('box'), 'en cola y en curso')}
            ${pickStatCard('emerald', 'Pedidos preparados', completados, pickIcon('check'), 'listos y despachados')}
            ${pickStatCard('cyan', 'Tiempo promedio', formatDuration(avgSec), pickIcon('clock'), 'por pedido')}
            ${pickStatCard('rose', 'Pedidos incompletos', parciales, pickIcon('alert'), 'faltaron productos')}
        </div>

        <div class="dashboard-main-grid">
            <div class="card">
                <div class="card-header"><h2 class="card-title">${pickIcon('check')} Eficiencia de preparación</h2>
                    <span class="badge ${efficiency >= 90 ? 'badge-success' : efficiency >= 70 ? 'badge-warning' : 'badge-danger'}">${efficiency}%</span></div>
                <div class="pick-progress-track" style="height:14px; margin:0.5rem 0 1.5rem;">
                    <div class="pick-progress-fill" style="width:${efficiency}%; background:var(--accent-emerald-gradient);"></div>
                </div>
                <h3 class="pick-mini-title">Productividad por operario (uds recogidas)</h3>
                ${barChart(opRows, 'var(--accent-cyan-gradient)') || emptyMini('Aún no hay operarios asignados.')}
                <h3 class="pick-mini-title" style="margin-top:1.5rem;">Movimientos por zona de bodega</h3>
                ${barChart(zoneRows, 'var(--accent-gold-gradient)') || emptyMini('Sin movimientos registrados.')}
            </div>

            <div class="card">
                <div class="card-header"><h2 class="card-title">${pickIcon('clock')} Productos por vencer</h2>
                    <span class="badge badge-warning">${expiring.length}</span></div>
                <div class="pick-expiry-list">
                    ${expiring.length === 0 ? emptyMini('Ningún producto próximo a vencer en los pedidos activos. 👍') :
                        expiring.slice(0, 6).map(e => `
                            <div class="pick-expiry-row">
                                <div>
                                    <div class="pick-expiry-name">${e.name}</div>
                                    <div class="pick-expiry-lot">Lote ${e.lot || '—'}</div>
                                </div>
                                <span class="badge ${e.days < 0 ? 'badge-danger' : e.days <= 15 ? 'badge-warning' : 'badge-info'}">
                                    ${e.days < 0 ? 'Vencido' : e.days + ' días'}
                                </span>
                            </div>`).join('')}
                </div>
                <h3 class="pick-mini-title" style="margin-top:1.5rem;">Productos con mayor movimiento</h3>
                ${barChart(topMoved, 'var(--accent-emerald-gradient)') || emptyMini('Sin movimientos todavía.')}
            </div>
        </div>
    `;
}

function pickStatCard(color, title, value, icon, period) {
    return `
        <div class="card stat-card stat-${color}">
            <div class="stat-header">
                <span class="stat-title">${title}</span>
                <div class="stat-icon-wrapper">${icon}</div>
            </div>
            <div class="stat-value">${value}</div>
            <div class="stat-meta"><span class="stat-period">${period}</span></div>
        </div>`;
}

function barChart(rows, gradient) {
    if (!rows || rows.length === 0) return '';
    const max = Math.max(...rows.map(r => r.value), 1);
    return `<div class="pick-barchart">` + rows.map(r => `
        <div class="pick-bar-row">
            <span class="pick-bar-label" title="${r.label}">${r.label}</span>
            <div class="pick-bar-track"><div class="pick-bar-fill" style="width:${(r.value / max) * 100}%; background:${gradient};"></div></div>
            <span class="pick-bar-value">${r.value}</span>
        </div>`).join('') + `</div>`;
}

function emptyMini(msg) {
    return `<div class="pick-empty-mini">${msg}</div>`;
}

// ==========================================================================
//   SUB-VISTA: NUEVA LISTA (pedidos listos para preparar)
// ==========================================================================
function renderPickingNew() {
    const c = document.getElementById('picking-content');
    const withList = new Set(state.pickingLists.map(l => l.orderRef));
    const pending = state.invoices.filter(inv => !withList.has(inv.id));

    c.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">${pickIcon('box')} Pedidos listos para preparar</h2>
                <span class="badge badge-info">${pending.length} sin lista</span>
            </div>
            <p class="pick-help">Cuando registras una venta, el sistema crea la lista de preparación automáticamente. Aquí puedes generar la lista de pedidos antiguos que aún no la tienen.</p>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead><tr>
                        <th>Pedido</th><th>Cliente</th><th>Fecha</th>
                        <th style="text-align:center;">Productos</th><th style="text-align:right;">Acción</th>
                    </tr></thead>
                    <tbody>
                        ${pending.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2.5rem 0;">Todos los pedidos ya tienen su lista de preparación. ✅</td></tr>` :
                        pending.map(inv => `
                            <tr>
                                <td style="font-family:'JetBrains Mono';font-weight:600;">${inv.id}</td>
                                <td>${inv.clientName}</td>
                                <td>${inv.date}</td>
                                <td style="text-align:center;">${inv.items.length}</td>
                                <td style="text-align:right;">
                                    <button class="btn btn-primary btn-sm" onclick="generatePickingFromOrder('${inv.id}')">Generar lista</button>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card" style="margin-top:1.5rem;">
            <div class="card-header"><h2 class="card-title">${pickIcon('check')} Listas creadas recientemente</h2></div>
            <div class="pick-card-grid">
                ${[...state.pickingLists].slice(-6).reverse().map(l => pickingListCard(l)).join('') || emptyMini('Aún no hay listas de preparación.')}
            </div>
        </div>
    `;
}

function generatePickingFromOrder(invoiceId) {
    const inv = state.invoices.find(i => i.id === invoiceId);
    if (!inv) { triggerToast('error', 'No se encontró el pedido.'); return; }
    if (state.pickingLists.some(l => l.orderRef === invoiceId)) {
        triggerToast('error', 'Este pedido ya tiene una lista de preparación.');
        return;
    }
    generatePickingFromInvoice(inv);
    renderPicking();
}

// --- Tarjeta resumen de una lista ---
function pickingListCard(list) {
    const p = listProgress(list);
    const st = PICKING_STATUS[list.status];
    const pr = PICKING_PRIORITY[list.priority] || PICKING_PRIORITY.media;
    return `
        <div class="pick-list-card status-${list.status}" onclick="openPickingDetail('${list.id}')">
            <div class="pick-list-card-top">
                <div>
                    <div class="pick-list-id">${list.id}</div>
                    <div class="pick-list-client">${list.clientName}</div>
                </div>
                <span class="badge ${st.badge}">${st.label}</span>
            </div>
            <div class="pick-list-meta">
                <span class="badge ${pr.badge}" style="font-size:0.68rem;">${pr.label}</span>
                <span class="pick-list-op">${pickIcon('box')} ${list.operator}</span>
            </div>
            <div class="pick-progress-track"><div class="pick-progress-fill status-fill-${list.status}" style="width:${p.pct}%;"></div></div>
            <div class="pick-list-foot">
                <span>${p.itemsDone}/${p.itemsTotal} productos</span>
                <span class="pick-list-pct">${p.pct}%</span>
            </div>
        </div>`;
}

// ==========================================================================
//   FILTROS
// ==========================================================================
const pickingFilters = { estado: 'all', operario: 'all', cliente: '', prioridad: 'all', zona: 'all' };

function applyPickingFilters() {
    pickingFilters.estado = document.getElementById('pf-estado')?.value || 'all';
    pickingFilters.operario = document.getElementById('pf-operario')?.value || 'all';
    pickingFilters.cliente = document.getElementById('pf-cliente')?.value || '';
    pickingFilters.prioridad = document.getElementById('pf-prioridad')?.value || 'all';
    pickingFilters.zona = document.getElementById('pf-zona')?.value || 'all';
    renderPicking();
}

function getFilteredLists(statuses) {
    return state.pickingLists.filter(l => {
        if (statuses && !statuses.includes(l.status)) return false;
        if (pickingFilters.estado !== 'all' && l.status !== pickingFilters.estado) return false;
        if (pickingFilters.operario !== 'all' && l.operator !== pickingFilters.operario) return false;
        if (pickingFilters.prioridad !== 'all' && l.priority !== pickingFilters.prioridad) return false;
        if (pickingFilters.cliente && !l.clientName.toLowerCase().includes(pickingFilters.cliente.toLowerCase())) return false;
        if (pickingFilters.zona !== 'all' && !l.items.some(it => it.aisle === pickingFilters.zona)) return false;
        return true;
    });
}

function pickingFilterBar(scopeStatuses) {
    const operators = [...new Set(state.pickingLists.map(l => l.operator))];
    return `
        <div class="card pick-filter-bar">
            <div class="pick-filter-group">
                <input type="text" class="form-input" id="pf-cliente" placeholder="Buscar cliente..." value="${pickingFilters.cliente}" oninput="applyPickingFilters()">
            </div>
            <select class="form-select" id="pf-estado" onchange="applyPickingFilters()">
                <option value="all">Todos los estados</option>
                ${(scopeStatuses || Object.keys(PICKING_STATUS)).map(s => `<option value="${s}" ${pickingFilters.estado === s ? 'selected' : ''}>${PICKING_STATUS[s].label}</option>`).join('')}
            </select>
            <select class="form-select" id="pf-operario" onchange="applyPickingFilters()">
                <option value="all">Todos los operarios</option>
                ${operators.map(o => `<option value="${o}" ${pickingFilters.operario === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select>
            <select class="form-select" id="pf-prioridad" onchange="applyPickingFilters()">
                <option value="all">Toda prioridad</option>
                ${Object.entries(PICKING_PRIORITY).map(([k, v]) => `<option value="${k}" ${pickingFilters.prioridad === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
            <select class="form-select" id="pf-zona" onchange="applyPickingFilters()">
                <option value="all">Toda la bodega</option>
                ${['A', 'B', 'C', 'D'].map(z => `<option value="${z}" ${pickingFilters.zona === z ? 'selected' : ''}>Pasillo ${z}</option>`).join('')}
            </select>
        </div>`;
}

// ==========================================================================
//   SUB-VISTA: EN PREPARACIÓN
// ==========================================================================
function renderPickingActive() {
    const c = document.getElementById('picking-content');
    const lists = getFilteredLists(['pendiente', 'en_proceso', 'parcial']);
    c.innerHTML = `
        ${pickingFilterBar(['pendiente', 'en_proceso', 'parcial'])}
        <div class="pick-card-grid">
            ${lists.length === 0 ? `<div class="card">${emptyMini('No hay pedidos en preparación con estos filtros.')}</div>` :
            lists.map(l => pickingListCard(l)).join('')}
        </div>`;
}

// ==========================================================================
//   SUB-VISTA: PREPARADOS / COMPLETADOS
// ==========================================================================
function renderPickingCompleted() {
    const c = document.getElementById('picking-content');
    const lists = getFilteredLists(['completado', 'despachado']);
    c.innerHTML = `
        ${pickingFilterBar(['completado', 'despachado'])}
        <div class="card">
            <div class="card-header"><h2 class="card-title">${pickIcon('truck')} Pedidos preparados y despachados</h2>
                <span class="badge badge-success">${lists.length}</span></div>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead><tr><th>Pedido</th><th>Cliente</th><th>Operario</th><th style="text-align:center;">Productos</th><th style="text-align:right;">Tiempo real</th><th>Estado</th><th style="text-align:right;">Acción</th></tr></thead>
                    <tbody>
                        ${lists.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2.5rem 0;">No hay pedidos preparados con estos filtros.</td></tr>` :
                        lists.map(l => {
                            const p = listProgress(l); const st = PICKING_STATUS[l.status];
                            return `<tr>
                                <td style="font-family:'JetBrains Mono';font-weight:600;">${l.id}</td>
                                <td>${l.clientName}</td>
                                <td>${l.operator}</td>
                                <td style="text-align:center;">${p.itemsDone}/${p.itemsTotal}</td>
                                <td style="text-align:right;font-family:'JetBrains Mono';">${formatDuration(elapsedSeconds(l))}</td>
                                <td><span class="badge ${st.badge}">${st.label}</span></td>
                                <td style="text-align:right;">
                                    <button class="btn btn-secondary btn-sm" onclick="openPickingDetail('${l.id}')">Ver</button>
                                    ${l.status === 'completado' ? `<button class="btn btn-primary btn-sm" onclick="dispatchPicking('${l.id}')">Despachar</button>` : ''}
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// ==========================================================================
//   SUB-VISTA: STOCK COMPROMETIDO
// ==========================================================================
function renderCommittedStock() {
    const c = document.getElementById('picking-content');
    const rows = state.products.map(p => {
        const committed = getCommittedStock(p.id);
        const available = Math.max(0, Number(p.stock) - committed);
        return { p, phys: Number(p.stock), committed, available };
    }).filter(r => r.committed > 0 || r.phys > 0);

    rows.sort((a, b) => b.committed - a.committed);

    c.innerHTML = `
        <div class="card">
            <div class="card-header"><h2 class="card-title">${pickIcon('box')} Unidades reservadas por pedidos en curso</h2></div>
            <p class="pick-help">El <strong>stock comprometido</strong> son unidades ya apartadas para pedidos que se están preparando. El <strong>disponible real</strong> es lo que aún puedes vender.</p>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead><tr><th>Producto</th><th>Ubicación</th><th style="text-align:right;">Stock físico</th><th style="text-align:right;">Comprometido</th><th style="text-align:right;">Disponible real</th><th style="min-width:140px;">Reserva</th></tr></thead>
                    <tbody>
                        ${rows.map(r => {
                            const pctCommitted = r.phys > 0 ? Math.min(100, (r.committed / r.phys) * 100) : (r.committed > 0 ? 100 : 0);
                            const loc = buildLocationCode(r.p);
                            return `<tr>
                                <td>
                                    <div class="product-meta-info">
                                        <span class="product-name">${r.p.name}</span>
                                        <span class="product-sku">${r.p.sku}</span>
                                    </div>
                                </td>
                                <td>${loc ? `<span class="pick-loc-chip">${loc}</span>` : '<span class="badge badge-danger">Sin ubicación</span>'}</td>
                                <td style="text-align:right;font-family:'JetBrains Mono';font-weight:600;">${r.phys}</td>
                                <td style="text-align:right;font-family:'JetBrains Mono';font-weight:700;color:var(--accent-gold);">${r.committed}</td>
                                <td style="text-align:right;font-family:'JetBrains Mono';font-weight:700;color:${r.available === 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">${r.available}</td>
                                <td>
                                    <div class="pick-progress-track" style="height:8px;"><div class="pick-progress-fill" style="width:${pctCommitted}%;background:var(--accent-gold-gradient);"></div></div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// ==========================================================================
//   SUB-VISTA: PRODUCTOS PENDIENTES (lo que falta por recoger)
// ==========================================================================
function renderPendingProducts() {
    const c = document.getElementById('picking-content');
    const pending = [];
    state.pickingLists.filter(l => ['pendiente', 'en_proceso', 'parcial'].includes(l.status)).forEach(l => {
        l.items.forEach(it => {
            const remaining = (it.requestedQty || 0) - (it.pickedQty || 0);
            if (remaining > 0) {
                const prod = state.products.find(p => p.id === it.productId);
                const phys = prod ? Number(prod.stock) : 0;
                let reason = 'Por recoger', reasonClass = 'badge-info';
                if (!it.aisle) { reason = 'Sin ubicación'; reasonClass = 'badge-danger'; }
                else if (phys < remaining) { reason = `Faltan ${remaining - phys} en bodega`; reasonClass = 'badge-danger'; }
                else if (daysToExpiry(it.expDate) !== null && daysToExpiry(it.expDate) <= 30) { reason = 'Por vencer'; reasonClass = 'badge-warning'; }
                pending.push({ list: l, it, remaining, reason, reasonClass });
            }
        });
    });

    // Ordenar por recorrido óptimo
    pending.sort((a, b) => {
        const az = AISLE_ORDER[a.it.aisle] || 9, bz = AISLE_ORDER[b.it.aisle] || 9;
        if (az !== bz) return az - bz;
        return (a.it.shelf || 0) - (b.it.shelf || 0);
    });

    c.innerHTML = `
        <div class="card">
            <div class="card-header"><h2 class="card-title">${pickIcon('alert')} Productos que faltan por recoger</h2>
                <span class="badge badge-warning">${pending.length}</span></div>
            <p class="pick-help">Lista ordenada por <strong>recorrido de bodega</strong> (del pasillo más cercano al más lejano) para que el operario camine lo mínimo.</p>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead><tr><th>Producto</th><th>Ubicación</th><th>Pedido</th><th style="text-align:center;">Faltan</th><th>Lote</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${pending.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2.5rem 0;">¡No hay productos pendientes! Todo está recogido. 🎉</td></tr>` :
                        pending.map(x => `
                            <tr>
                                <td><span class="product-name">${x.it.name}</span></td>
                                <td>${x.it.location ? `<span class="pick-loc-chip">${x.it.location}</span> <span class="pick-zone-tag">${zoneLabel(x.it.aisle)}</span>` : '<span class="badge badge-danger">Sin ubicación</span>'}</td>
                                <td style="font-family:'JetBrains Mono';font-size:0.8rem;cursor:pointer;color:var(--accent-cyan);" onclick="openPickingDetail('${x.list.id}')">${x.list.id}</td>
                                <td style="text-align:center;font-weight:700;">${x.remaining}</td>
                                <td style="font-family:'JetBrains Mono';font-size:0.8rem;">${x.it.lot || '—'}</td>
                                <td><span class="badge ${x.reasonClass}">${x.reason}</span></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// ==========================================================================
//   SUB-VISTA: HISTORIAL / AUDITORÍA
// ==========================================================================
function renderPickingHistory() {
    const c = document.getElementById('picking-content');
    const events = [];
    state.pickingLists.forEach(l => {
        (l.history || []).forEach(h => events.push({ ...h, listId: l.id, client: l.clientName }));
    });
    events.sort((a, b) => b.ts - a.ts);

    c.innerHTML = `
        <div class="card">
            <div class="card-header"><h2 class="card-title">${pickIcon('clock')} Historial de movimientos y cambios</h2>
                <button class="btn btn-secondary btn-sm" onclick="exportAllPickingCSV()">Exportar Excel/CSV</button></div>
            <div class="pick-timeline">
                ${events.length === 0 ? emptyMini('Sin movimientos registrados.') :
                events.slice(0, 60).map(e => {
                    const d = new Date(e.ts);
                    const time = d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    return `<div class="pick-timeline-item">
                        <div class="pick-timeline-dot"></div>
                        <div class="pick-timeline-body">
                            <div class="pick-timeline-head">
                                <strong>${e.action}</strong>
                                <span class="pick-timeline-time">${time}</span>
                            </div>
                            <div class="pick-timeline-detail">${e.detail} · <span style="color:var(--accent-cyan);">${e.listId}</span> · ${e.client} · ${e.by}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
}

// ==========================================================================
//   MODAL DE PREPARACIÓN INTERACTIVA
// ==========================================================================
let pickingTimerInterval = null;

function openPickingDetail(id) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    state.activePickingId = id;
    document.getElementById('picking-modal').classList.add('active');
    renderPickingDetailBody();

    // Cronómetro en vivo si está en preparación
    clearInterval(pickingTimerInterval);
    if (list.status === 'en_proceso') {
        pickingTimerInterval = setInterval(() => {
            const el = document.getElementById('pick-live-timer');
            if (el) el.innerText = formatDuration(elapsedSeconds(list));
            else clearInterval(pickingTimerInterval);
        }, 1000);
    }
}

function closePickingModal() {
    document.getElementById('picking-modal').classList.remove('active');
    clearInterval(pickingTimerInterval);
    state.activePickingId = null;
    renderPicking();
}

function renderPickingDetailBody() {
    const list = state.pickingLists.find(l => l.id === state.activePickingId);
    if (!list) return;
    const body = document.getElementById('picking-modal-body');
    const p = listProgress(list);
    const st = PICKING_STATUS[list.status];
    const isActive = ['pendiente', 'en_proceso', 'parcial'].includes(list.status);
    const operators = ['Sin asignar', 'Administrador Master', 'Jefe de Depósito', 'Operador de Caja'];
    if (PICKING_SESSION && !operators.includes(PICKING_SESSION.name)) operators.push(PICKING_SESSION.name);

    const ordered = sortByRoute(list.items);

    body.innerHTML = `
        <div class="pick-detail-head">
            <div>
                <div class="pick-detail-id">${list.id} <span class="badge ${st.badge}">${st.label}</span></div>
                <div class="pick-detail-client">${list.clientName} · ${list.clientId || ''}</div>
                <div class="pick-detail-sub">Pedido origen: ${list.orderRef} · ${list.date}</div>
            </div>
            <div class="pick-ring" style="--pct:${p.pct};">
                <div class="pick-ring-inner">${p.pct}%</div>
            </div>
        </div>

        <div class="pick-detail-controls">
            <div class="pick-ctrl">
                <label class="form-label">Operario asignado</label>
                <select class="form-select" ${isActive ? '' : 'disabled'} onchange="assignOperator('${list.id}', this.value)">
                    ${operators.map(o => `<option value="${o}" ${list.operator === o ? 'selected' : ''}>${o}</option>`).join('')}
                </select>
            </div>
            <div class="pick-ctrl">
                <label class="form-label">Prioridad</label>
                <select class="form-select" ${isActive ? '' : 'disabled'} onchange="setPriority('${list.id}', this.value)">
                    ${Object.entries(PICKING_PRIORITY).map(([k, v]) => `<option value="${k}" ${list.priority === k ? 'selected' : ''}>${v.label}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="pick-stat-row">
            <div class="pick-stat-box"><span class="pick-stat-num">${p.totalPicked}/${p.totalReq}</span><span class="pick-stat-lbl">Unidades recogidas</span></div>
            <div class="pick-stat-box"><span class="pick-stat-num">${p.remainingItems}</span><span class="pick-stat-lbl">Productos restantes</span></div>
            <div class="pick-stat-box"><span class="pick-stat-num">${formatDuration(list.estimatedSec)}</span><span class="pick-stat-lbl">Tiempo estimado</span></div>
            <div class="pick-stat-box"><span class="pick-stat-num" id="pick-live-timer">${formatDuration(elapsedSeconds(list))}</span><span class="pick-stat-lbl">Tiempo real</span></div>
        </div>

        ${isActive ? `
        <div class="pick-scan-box">
            <div class="pick-scan-input-wrap">
                ${pickIcon('box')}
                <input type="text" id="pick-scan-input" class="form-input" placeholder="Escanea o escribe el código / SKU del producto..."
                    onkeydown="if(event.key==='Enter'){validateScan('${list.id}', this.value); this.value='';}">
            </div>
            <button class="btn btn-secondary btn-sm" onclick="const i=document.getElementById('pick-scan-input'); validateScan('${list.id}', i.value); i.value='';">Validar</button>
            <button class="btn btn-secondary btn-sm" onclick="voicePickNext('${list.id}')" title="Leer en voz alta el siguiente producto">🔊 Voz</button>
        </div>` : ''}

        <div class="pick-items-list">
            ${ordered.map((it, idx) => pickItemRow(list, it, idx, isActive)).join('')}
        </div>

        <div class="pick-detail-actions">
            <button class="btn btn-secondary btn-sm" onclick="printPickingList('${list.id}')">${pickIcon('check')} Imprimir</button>
            <button class="btn btn-secondary btn-sm" onclick="exportPickingCSV('${list.id}')">Exportar CSV/PDF</button>
            <div style="flex:1;"></div>
            ${list.status === 'pendiente' ? `<button class="btn btn-primary" onclick="startPicking('${list.id}')">${pickIcon('play')} Iniciar preparación</button>` : ''}
            ${(list.status === 'en_proceso') ? `<button class="btn btn-primary" onclick="completePicking('${list.id}')">${pickIcon('check')} Finalizar</button>` : ''}
            ${(list.status === 'completado' || list.status === 'parcial') ? `<button class="btn btn-primary" onclick="dispatchPicking('${list.id}')">${pickIcon('truck')} Despachar</button>` : ''}
            ${isActive ? `<button class="btn btn-danger btn-sm" onclick="cancelPicking('${list.id}')">Cancelar</button>` : ''}
        </div>
    `;
}

function pickItemRow(list, it, idx, isActive) {
    const done = (it.pickedQty || 0) >= (it.requestedQty || 0);
    const partial = (it.pickedQty || 0) > 0 && !done;
    const d = daysToExpiry(it.expDate);
    const expBadge = d !== null && d <= 30 ? `<span class="badge ${d < 0 ? 'badge-danger' : 'badge-warning'}" style="font-size:0.62rem;">${d < 0 ? 'Vencido' : 'Vence ' + d + 'd'}</span>` : '';
    const fefoBadge = `<span class="pick-fefo-tag" title="Lote elegido por vencer primero">FEFO</span>`;
    return `
        <div class="pick-item-row ${done ? 'item-done' : partial ? 'item-partial' : ''}">
            <button class="pick-check ${done ? 'checked' : ''}" ${isActive ? '' : 'disabled'} onclick="togglePickItem('${list.id}','${it.productId}')">
                ${done ? pickIcon('check') : `<span class="pick-route-num">${idx + 1}</span>`}
            </button>
            <div class="pick-item-info">
                <div class="pick-item-name">${it.name}</div>
                <div class="pick-item-meta">
                    ${it.location ? `<span class="pick-loc-chip">${it.location}</span>` : '<span class="badge badge-danger" style="font-size:0.62rem;">Sin ubicación</span>'}
                    <span class="pick-zone-tag">${zoneLabel(it.aisle)}</span>
                    <span class="pick-lot-tag">${fefoBadge} Lote ${it.lot || '—'}</span>
                    ${expBadge}
                </div>
            </div>
            <div class="pick-item-qty">
                ${isActive ? `<input type="number" class="qty-input" min="0" max="${it.requestedQty}" value="${it.pickedQty || 0}" onchange="setPickItemQty('${list.id}','${it.productId}',this.value)">` : `<strong>${it.pickedQty || 0}</strong>`}
                <span class="pick-qty-of">/ ${it.requestedQty}</span>
            </div>
        </div>`;
}

// --- Acciones del operario ---
function logPicking(list, action, detail) {
    if (!list.history) list.history = [];
    const by = (PICKING_SESSION && PICKING_SESSION.name) || list.operator || 'Sistema';
    list.history.push({ ts: Date.now(), action, detail, by });
}

function recomputeStatus(list) {
    const p = listProgress(list);
    if (['despachado', 'cancelado'].includes(list.status)) return;
    if (p.totalPicked === 0) {
        list.status = list.startedAt ? 'en_proceso' : 'pendiente';
    } else if (p.totalPicked >= p.totalReq) {
        list.status = 'en_proceso'; // se marca "completado" al finalizar explícitamente
    } else {
        list.status = 'en_proceso';
    }
}

function startPicking(id) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    if (list.operator === 'Sin asignar' && PICKING_SESSION) {
        list.operator = PICKING_SESSION.name;
    }
    list.status = 'en_proceso';
    list.startedAt = Date.now();
    list.finishedAt = null;
    logPicking(list, 'Iniciada', 'Comenzó la preparación del pedido');
    savePickingToStorage();
    triggerToast('success', `Preparación de ${id} iniciada.`);
    openPickingDetail(id);
}

function togglePickItem(listId, productId) {
    const list = state.pickingLists.find(l => l.id === listId);
    if (!list) return;
    if (!list.startedAt) { list.status = 'en_proceso'; list.startedAt = Date.now(); logPicking(list, 'Iniciada', 'Comenzó la preparación'); }
    const it = list.items.find(i => i.productId === productId);
    if (!it) return;
    const done = (it.pickedQty || 0) >= it.requestedQty;
    it.pickedQty = done ? 0 : it.requestedQty;
    it.picked = !done;
    it.status = it.picked ? 'recogido' : 'pendiente';
    logPicking(list, it.picked ? 'Recogido' : 'Desmarcado', `${it.name} (${it.pickedQty}/${it.requestedQty})`);
    recomputeStatus(list);
    savePickingToStorage();
    renderPickingDetailBody();
}

function setPickItemQty(listId, productId, val) {
    const list = state.pickingLists.find(l => l.id === listId);
    if (!list) return;
    const it = list.items.find(i => i.productId === productId);
    if (!it) return;
    let q = parseInt(val);
    if (isNaN(q) || q < 0) q = 0;
    if (q > it.requestedQty) { q = it.requestedQty; triggerToast('error', `No puedes recoger más de lo pedido (${it.requestedQty}).`); }
    if (!list.startedAt && q > 0) { list.status = 'en_proceso'; list.startedAt = Date.now(); logPicking(list, 'Iniciada', 'Comenzó la preparación'); }
    it.pickedQty = q;
    it.picked = q >= it.requestedQty;
    it.status = it.picked ? 'recogido' : (q > 0 ? 'parcial' : 'pendiente');
    recomputeStatus(list);
    savePickingToStorage();
    renderPickingDetailBody();
}

function completePicking(id) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    const p = listProgress(list);
    list.finishedAt = Date.now();
    if (p.totalPicked >= p.totalReq) {
        list.status = 'completado';
        logPicking(list, 'Completada', 'Todos los productos recogidos');
        triggerToast('success', `${id} listo para despacho.`);
    } else {
        list.status = 'parcial';
        logPicking(list, 'Incompleta', `Faltaron ${p.remainingUnits} unidades`);
        triggerToast('error', `${id} quedó incompleto (faltan ${p.remainingUnits} uds).`);
    }
    clearInterval(pickingTimerInterval);
    savePickingToStorage();
    renderPickingDetailBody();
}

function dispatchPicking(id) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    if (!['completado', 'parcial'].includes(list.status)) {
        triggerToast('error', 'Primero finaliza la preparación del pedido.');
        return;
    }
    list.status = 'despachado';
    if (!list.finishedAt) list.finishedAt = Date.now();
    logPicking(list, 'Despachado', 'Pedido entregado a transporte');
    savePickingToStorage();
    triggerToast('success', `Pedido ${id} despachado correctamente.`);
    if (document.getElementById('picking-modal').classList.contains('active')) renderPickingDetailBody();
    renderPicking();
}

function cancelPicking(id) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    if (!confirm(`¿Cancelar la preparación del pedido ${id}? Las unidades dejarán de estar reservadas.`)) return;
    list.status = 'cancelado';
    logPicking(list, 'Cancelada', 'Preparación cancelada por el operario');
    clearInterval(pickingTimerInterval);
    savePickingToStorage();
    triggerToast('error', `Pedido ${id} cancelado.`);
    renderPickingDetailBody();
    renderPicking();
}

function assignOperator(id, name) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    list.operator = name;
    logPicking(list, 'Operario', `Asignado a ${name}`);
    savePickingToStorage();
    triggerToast('success', `Operario asignado: ${name}.`);
}

function setPriority(id, level) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    list.priority = level;
    logPicking(list, 'Prioridad', `Cambiada a ${PICKING_PRIORITY[level].label}`);
    savePickingToStorage();
}

// --- ESCANEO Y VALIDACIÓN ---
function validateScan(listId, code) {
    code = (code || '').trim();
    if (!code) return;
    const list = state.pickingLists.find(l => l.id === listId);
    if (!list) return;
    const lower = code.toLowerCase();
    const it = list.items.find(i =>
        (i.sku && i.sku.toLowerCase() === lower) ||
        (i.lot && i.lot.toLowerCase() === lower) ||
        (i.name && i.name.toLowerCase().includes(lower))
    );
    if (!it) {
        triggerToast('error', `El código "${code}" no pertenece a este pedido.`);
        return;
    }
    if ((it.pickedQty || 0) >= it.requestedQty) {
        triggerToast('error', `${it.name.split(' ').slice(0, 2).join(' ')} ya está completo.`);
        return;
    }
    if (!list.startedAt) { list.status = 'en_proceso'; list.startedAt = Date.now(); logPicking(list, 'Iniciada', 'Comenzó la preparación'); }
    it.pickedQty = (it.pickedQty || 0) + 1;
    it.picked = it.pickedQty >= it.requestedQty;
    it.status = it.picked ? 'recogido' : 'parcial';
    logPicking(list, 'Escaneado', `${it.name} (${it.pickedQty}/${it.requestedQty})`);
    recomputeStatus(list);
    savePickingToStorage();
    triggerToast('success', `✓ ${it.name.split(' ').slice(0, 2).join(' ')} validado (${it.pickedQty}/${it.requestedQty}).`);
    renderPickingDetailBody();
}

// --- PICKING POR VOZ (lee el siguiente producto en voz alta) ---
function voicePickNext(listId) {
    const list = state.pickingLists.find(l => l.id === listId);
    if (!list) return;
    const next = sortByRoute(list.items).find(it => (it.pickedQty || 0) < it.requestedQty);
    if (!next) { triggerToast('notif', 'No quedan productos por recoger.'); return; }
    const remaining = next.requestedQty - (next.pickedQty || 0);
    const msg = `Recoge ${remaining} unidades de ${next.name.split('(')[0]}. Ubicación ${next.location ? next.location.split('').join(' ') : 'no asignada'}.`;
    if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(msg);
        u.lang = 'es-ES'; u.rate = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    }
    triggerToast('notif', `🔊 ${msg}`);
}

// --- EXPORTACIÓN E IMPRESIÓN ---
function exportPickingCSV(id) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    const headers = ['Pedido', 'Cliente', 'Producto', 'SKU', 'Ubicacion', 'Lote', 'Vencimiento', 'Solicitado', 'Recogido', 'Estado'];
    const rows = sortByRoute(list.items).map(it => [
        list.id, `"${list.clientName}"`, `"${it.name}"`, it.sku, it.location, it.lot, it.expDate,
        it.requestedQty, it.pickedQty || 0, (it.pickedQty || 0) >= it.requestedQty ? 'Recogido' : 'Pendiente'
    ]);
    const csv = '﻿' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VULCAN_Picking_${list.id}.csv`;
    a.click();
    triggerToast('success', `Lista ${list.id} exportada.`);
}

function exportAllPickingCSV() {
    if (state.pickingLists.length === 0) { triggerToast('error', 'No hay listas para exportar.'); return; }
    const headers = ['Pedido', 'Cliente', 'Operario', 'Estado', 'Prioridad', 'Productos', 'Recogidas', 'Solicitadas', 'TiempoReal(s)'];
    const rows = state.pickingLists.map(l => {
        const p = listProgress(l);
        return [l.id, `"${l.clientName}"`, `"${l.operator}"`, PICKING_STATUS[l.status].label, PICKING_PRIORITY[l.priority].label, p.itemsTotal, p.totalPicked, p.totalReq, elapsedSeconds(l)];
    });
    const csv = '﻿' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VULCAN_Picking_Historial_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    triggerToast('success', 'Historial de preparación exportado.');
}

function printPickingList(id) {
    const list = state.pickingLists.find(l => l.id === id);
    if (!list) return;
    const ordered = sortByRoute(list.items);
    const w = window.open('', '_blank', 'width=800,height=900');
    const rows = ordered.map((it, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${it.name}</td>
            <td>${it.location || '—'}</td>
            <td>${it.lot || '—'}</td>
            <td style="text-align:center;">${it.requestedQty}</td>
            <td style="width:60px;border:1px solid #999;">&nbsp;</td>
        </tr>`).join('');
    w.document.write(`
        <html><head><title>Lista de Preparación ${list.id}</title>
        <style>
            body{font-family:Arial,sans-serif;padding:30px;color:#111;}
            h1{font-size:20px;margin:0 0 4px;} .sub{color:#555;font-size:13px;margin-bottom:18px;}
            table{width:100%;border-collapse:collapse;font-size:13px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;}
            th{background:#f3f3f3;} .meta{display:flex;gap:24px;margin-bottom:16px;font-size:13px;}
        </style></head><body>
        <h1>Lista de Preparación de Pedido</h1>
        <div class="sub">${list.id} · Generada por VULCAN FORGE</div>
        <div class="meta">
            <div><strong>Cliente:</strong> ${list.clientName}</div>
            <div><strong>Pedido:</strong> ${list.orderRef}</div>
            <div><strong>Fecha:</strong> ${list.date}</div>
            <div><strong>Operario:</strong> ${list.operator}</div>
        </div>
        <table><thead><tr><th>#</th><th>Producto</th><th>Ubicación</th><th>Lote</th><th>Cantidad</th><th>✓ Recogido</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p style="margin-top:30px;font-size:12px;color:#555;">Recorrido ordenado del pasillo más cercano al más lejano para minimizar desplazamientos.</p>
        </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
}