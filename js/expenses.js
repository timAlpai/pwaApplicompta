let currentExpenseItems = []; 
let ninjaResources = { vendors: [], categories: [], projects: [], clients: [] };

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialisation des listes Ninja
    //loadNinjaResources();

    const cameraInput = document.getElementById('expense-camera');
    if (cameraInput) {
        cameraInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const btn = document.querySelector('.expense-actions button');
            btn.textContent = i18n.t('analyzing');
            btn.disabled = true;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const response = await API.post('/ia/scan-receipt', { image: event.target.result });
                    if (response.success && response.data) {
                        fillExpenseModal(response.data);
                    }
                } catch (err) {
                    // Ancienne version Tim
                    // alert("Erreur analyse : " + err.message);

                    overlay.className = 'matrix-diag-overlay';

                    overlay.innerHTML = `
                        <div class="matrix-log-card">
                            <div class="matrix-log-header">
                                <span class="matrix-log-title">Parser Diagnostic v1.0</span>
                                <span style="color: #334155; font-size: 10px;">ID: ERR_ANALYSE</span>
                            </div>
                            <div class="matrix-log-body">
                                <div class="matrix-output-area">
                                    <span class="matrix-error-prefix">[!]</span>
                                    ${err.message}
                                </div>
                                <button id="matrix-btn-exit" class="matrix-close-btn">
                                    ${i18n.t('btn_retry_analysis')}
                                </button>
                            </div>
                        </div>
                    `;

                    // Logique de fermeture
                    document.getElementById('matrix-btn-exit').onclick = () => {
                        overlay.style.display = 'none';
                    };
                } finally {
                    btn.textContent = "📸 Prendre un Ticket";
                    btn.disabled = false;
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // 2. Gestion de la soumission du formulaire
    const confirmForm = document.getElementById('expense-confirm-form');
    if (confirmForm) {
        confirmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = confirmForm.querySelector('.btn-save');
            btn.disabled = true;
            btn.textContent = i18n.t('recording');

            const payload = {
                vendor_id: document.getElementById('exp-vendor-id').value,
                vendor_name: document.getElementById('exp-vendor-name').value,
                vendor_address: document.getElementById('exp-address').value,
                vendor_vat: document.getElementById('exp-vat').value,
                category_id: document.getElementById('exp-category-id').value,
                client_id: document.getElementById('exp-client-id').value,
                project_id: document.getElementById('exp-project-id').value,
                date: document.getElementById('exp-date').value,
                fiscal_id: document.getElementById('exp-fiscal').value,
                payment_method: document.getElementById('exp-payment').value,
                items: currentExpenseItems,
                is_paid: document.getElementById('exp-is-paid').checked,
                should_be_invoiced: document.getElementById('exp-billable').checked
            };

            try {
                await API.post('/ninja/expenses', payload);

                // Ancienne version Tim 
               // alert("Dépense enregistrée avec succès !");

                overlay.className = 'vault-overlay-mask';

                overlay.innerHTML = `
                    <div class="vault-success-card">
                        <div class="vault-icon-badge">💰</div>
                        <h3 class="vault-main-title">Enregistrement OK</h3>
                        <p class="vault-sub-text">
                            Votre dépense a été ajoutée avec succès à votre comptabilité.
                        </p>
                        <button id="vault-btn-close" class="vault-confirm-btn">
                            Génial, merci !
                        </button>
                    </div>
                `;

                // Logique de fermeture
                document.getElementById('vault-btn-close').onclick = () => {
                    overlay.style.display = 'none';
                };

                closeExpenseConfirm();
            } catch (err) {
                alert(i18n.t('error_ninja_prefix') + ": " + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = i18n.t('btn_save_expense');
            }
        });
    }
});

// Charger les ressources depuis WordPress -> Ninja
async function loadNinjaResources() {
    try {
        const res = await API.get('/ninja/expense-resources');
        ninjaResources = res;
        
        populateSelect('exp-vendor-id', res.vendors, 'name');
        populateSelect('exp-category-id', res.categories, 'name');
        populateSelect('exp-client-id', res.clients, 'display_name');
        populateSelect('exp-project-id', res.projects, 'name');
    } catch (e) {
        console.log("Erreur chargement ressources Ninja", e);
    }
}

function populateSelect(id, list, field) {
    const s = document.getElementById(id);
    if (!s) return;
    s.innerHTML = `<option value="">-- ${i18n.t('select_placeholder')}</option>`;
    list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item[field];
        s.appendChild(opt);
    });
}

// Fonction de remplissage du modal
function fillExpenseModal(data) {
    console.log("Remplissage du modal avec les données sécurisées");

    // Fonction helper pour remplir un champ seulement s'il existe
    const safeSet = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    // 1. Remplissage des champs (Mapping IA -> HTML)
    safeSet('exp-vendor-name', data.vendor);
    safeSet('exp-address', data.vendor_address);
    safeSet('exp-vat', data.vendor_vat);
    safeSet('exp-date', data.date);
    safeSet('exp-payment', data.payment_method);
    safeSet('exp-fiscal', data.fiscal_id);

    // 2. Mise à jour du total
    const totalDisplay = document.getElementById('exp-total-display');
    if (totalDisplay) {
        totalDisplay.textContent = data.total_amount || 0;
    }

    // 3. Tentative de matching automatique du fournisseur Ninja
    const vendorSelect = document.getElementById('exp-vendor-id');
    if (vendorSelect && ninjaResources.vendors && data.vendor) {
        const match = ninjaResources.vendors.find(v => 
            v.name.toLowerCase().includes(data.vendor.toLowerCase())
        );
        if (match) {
            vendorSelect.value = match.id;
            const msg = document.getElementById('vendor-match-msg');
            if (msg) msg.textContent = "✓ Match : " + match.name;
        }
    }

    // 4. Rendu des lignes
    if (typeof renderExpenseLines === 'function') {
        renderExpenseLines(data.line_items || []);
    }

    // 5. Affichage du modal
    const modal = document.getElementById('expense-confirm-modal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error("ERREUR : L'élément 'expense-confirm-modal' est introuvable dans le HTML");
    }
}

// LA FONCTION QUI MANQUAIT
function renderExpenseLines(items) {
    currentExpenseItems = items;
    const container = document.getElementById('exp-lines-container');
    if (!container) return;

    container.innerHTML = '';
    currentExpenseItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'quote-line-item';
        div.style.padding = "8px 0";
        div.style.borderBottom = "1px solid #eee";
        div.innerHTML = `
            <div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">${item.notes}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 5px; align-items: center;">
                    <input type="number" step="0.01" value="${item.cost}" 
                           onchange="currentExpenseItems[${index}].cost=parseFloat(this.value)" 
                           style="width: 70px; padding: 4px;">
                    <span style="font-size: 0.8rem;">€ x</span>
                    <input type="number" value="${item.qty}" 
                           onchange="currentExpenseItems[${index}].qty=parseFloat(this.value)" 
                           style="width: 40px; padding: 4px;">
                </div>
                <div style="font-size: 0.7rem; color: #888;">TVA: ${item.tax_name || ''}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function closeExpenseConfirm() {
    document.getElementById('expense-confirm-modal').classList.remove('active');
}