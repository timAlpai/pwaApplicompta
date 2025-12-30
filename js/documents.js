// Charge la liste des Devis
async function loadQuotes() {
    await loadDocuments('quote', 'quotes-list');
}

// Charge la liste des Factures
async function loadInvoices() {
    await loadDocuments('invoice', 'invoices-list');
}

// Fonction générique
async function loadDocuments(type, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<p style="text-align:center; padding:20px;">Chargement...</p>';

    // Mapping pour l'API (Invoice Ninja utilise 'invoices' et 'quotes')
    const endpoint = type === 'invoice' ? '/ninja/invoices' : '/ninja/quotes';

    try {
        const response = await API.get(endpoint);
        const docs = response.data || [];
        renderDocuments(docs, container, type);
    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Erreur: ${error.message}</p>`;
    }
}

function renderDocuments(docs, container, type) {
    container.innerHTML = '';

    if (docs.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">Aucun document trouvé.</p>';
        return;
    }

    docs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'client-item'; // On réutilise le style CSS des items clients (carte blanche)
        
        // Formatage Date
        const dateStr = doc.date || doc.created_at; 
        const dateDisplay = new Date(dateStr).toLocaleDateString('fr-BE');

        // Formatage Montant
        const amount = parseFloat(doc.amount || 0).toFixed(2);
        
        // Statut (Logique simplifiée, à adapter selon les statuts Ninja v5)
        let statusLabel = doc.status_id; 
        // Astuce : vous pourrez faire un mapping des status_id plus tard

        div.innerHTML = `
            <div class="client-info">
                <h4 style="margin-bottom:2px;">${doc.number}</h4>
                <p style="font-size:0.85rem; color:#666;">${doc.client ? doc.client.name : 'Client inconnu'}</p>
                <p style="font-size:0.75rem; color:#999;">${dateDisplay}</p>
            </div>
            <div class="client-balance" style="text-align:right;">
                <div style="font-weight:bold; font-size:1.1rem;">${amount} €</div>
                <small style="color:#888;">${type === 'quote' ? 'Devis' : 'Facture'}</small>
            </div>
        `;
        
        // div.onclick = ... (Pour ouvrir le détail plus tard)
        container.appendChild(div);
    });
}
// --- GESTION MODAL CRÉATION DEVIS ---
// --- GESTION MODAL CRÉATION DEVIS (AVEC LIGNES) ---

// --- GESTION MODAL (CRÉATION & ÉDITION) ---

async function openQuoteModal(quote = null) {
    const modal = document.getElementById('quote-modal');
    const form = document.getElementById('quote-form');
    const select = document.getElementById('quote-client-id');
    const dateInput = document.getElementById('quote-date');
    const notesInput = document.getElementById('quote-public-notes');
    const idInput = document.getElementById('quote-id');
    const linesContainer = document.getElementById('quote-lines-container');
    const btnSave = form.querySelector('.btn-save');

    // 1. Reset visuel
    form.reset();
    linesContainer.innerHTML = ''; 
    
    // 2. Gestion Mode (Création vs Édition)
    if (quote) {
        // MODE ÉDITION
        document.querySelector('#quote-modal h3').textContent = "Modifier Devis " + quote.number;
        btnSave.textContent = "Mettre à jour";
        idInput.value = quote.id;
        dateInput.value = quote.date; // Format YYYY-MM-DD standard Ninja
        notesInput.value = quote.public_notes || '';
    } else {
        // MODE CRÉATION
        document.querySelector('#quote-modal h3').textContent = "Nouveau Devis";
        btnSave.textContent = "Créer Devis";
        idInput.value = ''; // Vide
        dateInput.valueAsDate = new Date();
    }

    // 3. Ouvrir modal
    modal.classList.add('active');

    // 4. Charger Clients
    select.innerHTML = '<option value="">Chargement...</option>';
    
    // (Logique de cache client optimisée)
    let clients = [];
    if (typeof clientsList !== 'undefined' && clientsList.length > 0) {
        clients = clientsList;
    } else {
        try {
            const response = await API.get('/ninja/clients');
            clients = response.data || [];
            if(typeof clientsList !== 'undefined') clientsList = clients; 
        } catch (e) {
            select.innerHTML = '<option>Erreur chargement</option>';
            return;
        }
    }

    // Remplir le select
    select.innerHTML = '<option value="">-- Choisir un client --</option>';
    clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });

    // 5. Sélectionner le bon client et remplir les lignes (APRÈS chargement select)
    if (quote) {
        select.value = quote.client_id;

        // Remplir les lignes existantes
        if (quote.line_items && quote.line_items.length > 0) {
            quote.line_items.forEach(line => {
                addQuoteLine(line); // On passe les données à la fonction
            });
        } else {
             addQuoteLine(); // Ligne vide si aucune ligne trouvée
        }
    } else {
        // Mode création : une ligne vide par défaut
        addQuoteLine();
    }
}

// Fonction pour ajouter une ligne HTML
// Fonction pour ajouter une ligne (vide ou pré-remplie)
window.addQuoteLine = function(data = null) {
    const container = document.getElementById('quote-lines-container');
    const div = document.createElement('div');
    div.className = 'quote-line-item';
    
    const descVal = data ? (data.notes || '') : '';
    const costVal = data ? (data.cost || '') : '';
    const qtyVal  = data ? (data.quantity || 1) : 1;

    div.innerHTML = `
        <button type="button" class="line-remove-btn" onclick="this.parentElement.remove()">×</button>
        
        <input type="text" class="line-desc" value="${descVal}" placeholder="Description" required style="width:100%; margin-bottom:5px;">
        
        <div class="quote-line-row">
            <div style="flex:1">
                <input type="number" class="line-cost" value="${costVal}" placeholder="Prix" step="0.01" required style="width:100%">
            </div>
            <div style="flex:1">
                <input type="number" class="line-qty" value="${qtyVal}" placeholder="Qté" step="0.1" required style="width:100%">
            </div>
        </div>
    `;
    container.appendChild(div);
}

function closeQuoteModal() {
    document.getElementById('quote-modal').classList.remove('active');
}

// Soumission du formulaire
document.addEventListener('DOMContentLoaded', () => {
    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = quoteForm.querySelector('.btn-save');
            const originalText = btn.textContent;
            btn.disabled = true; btn.textContent = "Création...";

            // A. Récupération des lignes
            const lineItems = [];
            document.querySelectorAll('.quote-line-item').forEach(item => {
                const desc = item.querySelector('.line-desc').value;
                const cost = parseFloat(item.querySelector('.line-cost').value);
                const qty = parseFloat(item.querySelector('.line-qty').value);
                
                if (desc && cost) {
                    lineItems.push({
                        notes: desc, // Ninja utilise 'notes' pour la description libre
                        cost: cost,
                        quantity: qty
                        // product_key: 'ITEM' // Optionnel si pas de catalogue
                    });
                }
            });

            if (lineItems.length === 0) {
                alert("Ajoutez au moins une ligne au devis.");
                btn.disabled = false; btn.textContent = originalText;
                return;
            }

            // B. Construction Payload
            const payload = {
                client_id: document.getElementById('quote-client-id').value,
                date: document.getElementById('quote-date').value,
                public_notes: document.getElementById('quote-public-notes').value,
                line_items: lineItems // Envoi du tableau
            };

            try {
                await API.post('/ninja/quotes', payload);
                closeQuoteModal();
                loadQuotes(); 
            } catch (err) {
                alert("Erreur: " + err.message);
            } finally {
                btn.disabled = false; btn.textContent = originalText;
            }
        });
    }
});