// Variables locales
let currentCompanyData = null;
let staticListsCache = null;

// Fonction principale (exposée globalement) 
// js/settings.js

window.fetchNinjaAccount = async function() {
    const container = document.getElementById('company-settings-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:30px;">${i18n.t('loading_data')}</div>`;

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
            container.innerHTML = `<p style="text-align:center;">${i18n.t('no_company_data')}</p>`;
        }
    } catch (error) {
        console.error("Édtail de l'erreur:", error);
        container.innerHTML = `<p style="color:red; text-align:center;">${i18n.t('error_prefix')}: ${error.message}</p>`;
    }
};

// Rendu visuel
function renderDashboardHeader(data, container) {
    let addressDisplay = (data.address1 || data.city) 
        ? `${data.address1}${data.address2 ? ', ' + data.address2 : ''}<br>${data.postal_code} ${data.city}` 
        : `<span style="font-style:italic; opacity:0.8;">\ud83d\udccd ${i18n.t('add_address')}</span>`;
        
    const phoneDisplay = data.phone || '<span style="font-style:italic; opacity:0.8;">📞 Ajouter un téléphone</span>';
    const emailDisplay = data.email || '<span style="font-style:italic; opacity:0.8;">✉️ Ajouter un email</span>';

    const addrClass = (data.address1 && data.city) ? '' : 'missing';
    const phoneClass = data.phone ? '' : 'missing';
    const emailClass = data.email ? '' : 'missing';

    container.innerHTML = `
        <div class="company-identity">
            <div class="company-avatar">${data.name.charAt(0).toUpperCase()}</div>
            <div class="company-info-text">
                <h1 class="company-name">${data.name}</h1>
                <div class="company-sub" data-i18n="company_configuration">Configuration Société</div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-item ${addrClass}" onclick="openEditModal()">
                <div class="info-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <div class="info-text">${addressDisplay}</div>
            </div>
            <div class="info-item ${phoneClass}" onclick="openEditModal()">
                <div class="info-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div class="info-text">${phoneDisplay}</div>
            </div>
            <div class="info-item ${emailClass}" onclick="openEditModal()">
                <div class="info-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <div class="info-text">${emailDisplay}</div>
            </div>
        </div>`;
}

// Gestion des listes dynamiques
async function loadStaticLists() {
    const countrySelect = document.getElementById('edit-country-id');
    
    if (staticListsCache) {
        populateSelects(staticListsCache);
        return;
    }

    try {
        if(countrySelect) countrySelect.innerHTML = `<option>${i18n.t('loading')}</option>`;
        const data = await API.get('/utils/lists'); 
        staticListsCache = data;
        populateSelects(data);
    } catch (error) {
        console.error("Erreur listes:", error);
        if(countrySelect) countrySelect.innerHTML = `<option value="56">${i18n.t('country_default')}</option>`;
    }
}

function populateSelects(data) {
    const countrySelect = document.getElementById('edit-country-id');
    const currencySelect = document.getElementById('edit-currency-id');

    if (countrySelect) {
        countrySelect.innerHTML = `<option value=\"\">${i18n.t('choose_country')}</option>`;
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
        currencySelect.innerHTML = `<option value=\"\">${i18n.t('btn_choose')}</option>`;
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
            btn.disabled = true; btn.textContent = i18n.t('saving');

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
                alert(i18n.t('error_prefix') + ": " + error.message);
            } finally {
                btn.disabled = false; btn.textContent = originalText;
            }
        });
    }
});
// Language selector event listener
document.addEventListener('DOMContentLoaded', function() {
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
        // Set the current language on page load
        languageSelector.value = i18next.language;

        // Listen to changes
        languageSelector.addEventListener('change', function(event) {
            const selectedLang = event.target.value;
            i18n.changeLanguage(selectedLang);
        });
    }
});

    // Bind when navigating to cash journal view
    function initCashJournalTile() {
        const cashTile = document.querySelector('.menu-tile.bg-olive');
        if (cashTile) {
            cashTile.addEventListener('click', () => {
                // ensure cash-journal script loaded
                if (!window.cashJournal) {
                    const s = document.createElement('script');
                    s.src = 'js/cash-journal.js?v=1.0';
                    document.body.appendChild(s);
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', initCashJournalTile);
