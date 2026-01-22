// Variables locales
let currentCompanyData = null;
let staticListsCache = null;

// Fonction principale (exposée globalement) 
// js/settings.js

window.fetchNinjaAccount = async function() {
    const container = document.getElementById('company-settings-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:30px;">Chargement des données...</div>';

    try {
        const response = await API.get('/ninja/account');
        
        // Sécurité : On vérifie si response.data existe et contient au moins un élément
        const companyData = (response.data && response.data[0]) ? response.data[0] : null;

        if (companyData) {
            const settings = companyData.settings || {};

            // On stocke tout dans la variable globale currentCompanyData
            // IMPORTANT : On utilise uniquement "companyData" ici pour éviter l'erreur "not defined"
            currentCompanyData = {
                id: companyData.id,
                name: settings.name || companyData.name || 'Ma Société',
                address1: settings.address1 || '',
                address2: settings.address2 || '',
                city: settings.city || '',
                state: settings.state || '',
                postal_code: settings.postal_code || '',
                phone: settings.phone || '',
                email: settings.email || '',
                country_id: settings.country_id || '56',
                currency_id: settings.currency_id || '3',
                
                // Données injectées par WordPress (PHP)
                smtp_host: companyData.smtp_host || '',
                smtp_port: companyData.smtp_port || '',
                smtp_user: companyData.smtp_user || '',
                html_template: companyData.html_template || '',
                logo_url: companyData.logo_url || ''
            };

            // On affiche le header
            renderDashboardHeader(currentCompanyData, container);
        } else {
            container.innerHTML = '<p style="text-align:center;">Aucune donnée société trouvée.</p>';
        }
    } catch (error) {
        console.error("Détail de l'erreur:", error);
        container.innerHTML = `<p style="color:red; text-align:center;">Erreur : ${error.message}</p>`;
    }
};

// Rendu visuel
function renderDashboardHeader(data, container) {
    let addressDisplay = (data.address1 || data.city) 
        ? `${data.address1}${data.address2 ? ', ' + data.address2 : ''}<br>${data.postal_code} ${data.city}` 
        : '<span style="font-style:italic; opacity:0.8;">📍 Ajouter une adresse</span>';
        
    const phoneDisplay = data.phone || '<span style="font-style:italic; opacity:0.8;">📞 Ajouter un téléphone</span>';
    const emailDisplay = data.email || '<span style="font-style:italic; opacity:0.8;">✉️ Ajouter un email</span>';

    const addrClass = (data.address1 && data.city) ? '' : 'missing';
    const phoneClass = data.phone ? '' : 'missing';
    const emailClass = data.email ? '' : 'missing';

    container.innerHTML = `
        <div class="company-identity">
            <div class="company-avatar">${data.name.charAt(0).toUpperCase()}</div>
            <h1 class="company-name">${data.name}</h1>
            <div class="company-sub">Configuration Société</div>
        </div>

        <div class="info-grid">
            <div class="info-item ${addrClass}" onclick="openEditModal()">
                <div class="info-icon">🏠</div>
                <div>${addressDisplay}</div>
            </div>
            <div class="info-item ${phoneClass}" onclick="openEditModal()">
                <div class="info-icon">📱</div>
                <div>${phoneDisplay}</div>
            </div>
            <div class="info-item ${emailClass}" onclick="openEditModal()">
                <div class="info-icon">@</div>
                <div>${emailDisplay}</div>
            </div>
        </div>
        
  
    `;
}

// Gestion des listes dynamiques
async function loadStaticLists() {
    const countrySelect = document.getElementById('edit-country-id');
    
    if (staticListsCache) {
        populateSelects(staticListsCache);
        return;
    }

    try {
        if(countrySelect) countrySelect.innerHTML = '<option>Chargement...</option>';
        const data = await API.get('/utils/lists'); 
        staticListsCache = data;
        populateSelects(data);
    } catch (error) {
        console.error("Erreur listes:", error);
        if(countrySelect) countrySelect.innerHTML = '<option value="56">Belgique (Défaut)</option>';
    }
}

function populateSelects(data) {
    const countrySelect = document.getElementById('edit-country-id');
    const currencySelect = document.getElementById('edit-currency-id');

    if (countrySelect) {
        countrySelect.innerHTML = '<option value="">Choisir un pays...</option>';
        const countries = Array.isArray(data.countries) ? data.countries : [];
        const priorityIds = ['56', '250', '442', '528', '276', '756', '124', '840']; 

        countries.sort((a, b) => {
            const isPrioA = priorityIds.includes(String(a.id));
            const isPrioB = priorityIds.includes(String(b.id));
            if (isPrioA && !isPrioB) return -1;
            if (!isPrioA && isPrioB) return 1;
            return a.name.localeCompare(b.name);
        });

        countries.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            countrySelect.appendChild(opt);
        });

        if (currentCompanyData && currentCompanyData.country_id) {
            countrySelect.value = currentCompanyData.country_id;
        } else {
            countrySelect.value = "56";
        }
    }
    
    if (currencySelect) {
        currencySelect.innerHTML = '<option value="">Choisir...</option>';
        const currencies = Array.isArray(data.currencies) ? data.currencies : [];
        currencies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.code} (${c.symbol})`;
            currencySelect.appendChild(opt);
        });
        if (currentCompanyData && currentCompanyData.currency_id) {
            currencySelect.value = currentCompanyData.currency_id;
        }
    }
}

// Fonctions des modules (exposées globalement)
window.openEditModal = function() {
    if(!currentCompanyData) return;
    // Lance le chargement des listes
    loadStaticLists(); 

    // Remplissage du formulaire
    document.getElementById('edit-company-id').value = currentCompanyData.id;
    document.getElementById('edit-address').value = currentCompanyData.address1;
    document.getElementById('edit-address2').value = currentCompanyData.address2;
    document.getElementById('edit-zip').value = currentCompanyData.postal_code;
    document.getElementById('edit-city').value = currentCompanyData.city;
    document.getElementById('edit-state').value = currentCompanyData.state;
    document.getElementById('edit-phone').value = currentCompanyData.phone;
    document.getElementById('edit-email').value = currentCompanyData.email;
     // --- CORRECTION : REMPLISSAGE DES NOUVEAUX CHAMPS ---
    document.getElementById('edit-smtp-host').value = currentCompanyData.smtp_host;
    document.getElementById('edit-smtp-port').value = currentCompanyData.smtp_port;
    document.getElementById('edit-smtp-user').value = currentCompanyData.smtp_user;
    document.getElementById('edit-smtp-pass').value = ""; // Toujours vide pour la sécurité
    
    // Bien cibler les IDs de votre index.html
    document.getElementById('edit-html-template').value = currentCompanyData.html_template;
    document.getElementById('edit-logo-url').value = currentCompanyData.logo_url;
    
    document.getElementById('edit-modal').classList.add('active');
};

window.closeEditModal = function() {
    document.getElementById('edit-modal').classList.remove('active');
};

// Initialisation du formulaire 

// On attend que le DOM soit prêt pour attacher l'événement
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('.btn-save');
            const originalText = btn.textContent;
            btn.disabled = true; btn.textContent = "Sauvegarde...";

            const payload = {
                company_id: document.getElementById('edit-company-id').value,
                country_id: document.getElementById('edit-country-id') ? document.getElementById('edit-country-id').value : '56',
                address1: document.getElementById('edit-address').value,
                address2: document.getElementById('edit-address2').value,
                postal_code: document.getElementById('edit-zip').value,
                city: document.getElementById('edit-city').value,
                state: document.getElementById('edit-state').value,
                phone: document.getElementById('edit-phone').value,
                email: document.getElementById('edit-email').value,
                smtp_host: document.getElementById('edit-smtp-host').value,
    smtp_port: document.getElementById('edit-smtp-port').value,
    smtp_user: document.getElementById('edit-smtp-user').value,
    smtp_pass: document.getElementById('edit-smtp-pass').value, // On envoie le nouveau pass si rempli
    html_template: document.getElementById('edit-html-template').value,
    logo_url: document.getElementById('edit-logo-url').value
            };

            try {
                await API.post('/ninja/account', payload);
                closeEditModal();
                // Rafraîchir l'affichage
                fetchNinjaAccount(); 
            } catch (error) {
                alert("Erreur: " + error.message);
            } finally {
                btn.disabled = false; btn.textContent = originalText;
            }
        });
    }
});