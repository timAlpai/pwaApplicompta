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
        
        // Maintenant : On vérifie si "response" est déjà le tableau (ce qui est le cas avec votre JSON)
        let docs = [];
        if (Array.isArray(response)) {
            docs = response; // Cas actuel (PHP filtré)
        } else if (response.data && Array.isArray(response.data)) {
            docs = response.data; // Ancien cas (compatibilité)
        }

        // On lance l'affichage
        renderDocuments(docs, container, type);
    } catch (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Erreur: ${error.message}</p>`;
    }
}
function renderDocuments(docs, container, type) {
    container.innerHTML = '';
    
    // Filtrer les documents supprimés
    const activeDocs = docs.filter(doc => {
        return !doc.is_deleted && (!doc.archived_at || doc.archived_at === 0);
    });

    if (activeDocs.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">Aucun document trouvé.</p>';
        return;
    }

    activeDocs.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'client-item'; 
        
        // Formatage
        const dateStr = doc.date || doc.created_at; 
        const dateDisplay = new Date(dateStr).toLocaleDateString('fr-BE');
        const amount = parseFloat(doc.amount || 0).toFixed(2);
        
        // Boutons d'action
        let actionsHtml = '';
        
        // Pour les Devis : Convertir + Supprimer
        if (type === 'quote') {
            actionsHtml = `
                <button class="btn-icon-list" onclick="convertQuote(event, '${doc.id}')" style="background:#eafaf1; color:#27ae60;">💶</button>
                <button class="btn-icon-list" onclick="deleteQuote(event, '${doc.id}')" style="background:#ffeaea; color:#e74c3c;">🗑️</button>
            `;
        } 
        // Pour les FACTURES : Supprimer uniquement (pour l'instant)
        else if (type === 'invoice') {
             actionsHtml = `
                <button class="btn-icon-list" onclick="deleteInvoice(event, '${doc.id}')" style="background:#ffeaea; color:#e74c3c;">🗑️</button>
            `;
        }

        // HTML de la ligne
        div.innerHTML = `
            <div class="client-info">
                <h4 style="margin-bottom:2px;">${doc.number}</h4>
                <p style="font-size:0.85rem; color:#666;">${doc.client ? doc.client.name : 'Client inconnu'}</p>
                <p style="font-size:0.75rem; color:#999;">${dateDisplay}</p>
            </div>
            
            <div style="display:flex; align-items:center; gap:15px;">
                <div class="client-balance" style="text-align:right;">
                    <div style="font-weight:bold; font-size:1.1rem;">${amount} €</div>
                    <small style="color:#888;">${type === 'quote' ? 'Devis' : 'Facture'}</small>
                </div>
                ${actionsHtml}
            </div>
        `;
        
        // Clic pour l'édition
        if (type === 'quote') {
            div.onclick = () => openQuoteModal(doc);
        } else if (type === 'invoice') {
            div.onclick = () => openInvoiceModal(doc); 
        }

        container.appendChild(div);
    });
}

// Gestion de la module de création et d'édition
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
        // %pde édition
        document.querySelector('#quote-modal h3').textContent = "Modifier Devis " + quote.number;
        btnSave.textContent = "Mettre à jour";
        idInput.value = quote.id;
        dateInput.value = quote.date; // Format YYYY-MM-DD standard Ninja
        notesInput.value = quote.public_notes || '';
    } else {
        // Mode création
        document.querySelector('#quote-modal h3').textContent = "Nouveau Devis";
        btnSave.textContent = "Créer Devis";
        idInput.value = ''; // Vide
        dateInput.valueAsDate = new Date();
    }

    // 3. Ouvrir me  modal
    modal.classList.add('active');

    // 4. Charger mes Clients
    select.innerHTML = '<option value="">Chargement...</option>';
    
    // Logique de cache client optimisée
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
                        notes: desc, // Invoice Ninja utilise 'notes' pour la description libre
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

            // B. Construction du Payload
            const quoteIdValue = document.getElementById('quote-id').value; // Récupère l'ID caché

            const payload = {
                id: quoteIdValue, // Ajout important : on envoie l'ID (vide si création, rempli si édition)
                client_id: document.getElementById('quote-client-id').value,
                date: document.getElementById('quote-date').value,
                public_notes: document.getElementById('quote-public-notes').value,
                line_items: lineItems 
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

// Fonction de suppression appelée depuis la liste
window.deleteQuote = async function(event, id) {
    // Empêche le clic de se propager au parent (qui ouvrirait le modal)
    event.stopPropagation();

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce devis définitivement ?")) {
        return;
    }

    // Petit effet visuel sur le bouton pour montrer que ça charge
    const btn = event.target.closest('button');
    if(btn) {
        btn.innerHTML = '...';
        btn.disabled = true;
    }

    try {
        await API.delete('/ninja/quotes/' + id);
        // On recharge la liste pour voir le changement
        loadQuotes();
    } catch (error) {
        alert("Erreur lors de la suppression : " + error.message);
        // Si erreur, on remet l'icône
        if(btn) {
            btn.innerHTML = '🗑️';
            btn.disabled = false;
        }
    }
};

window.convertQuote = async function(event, id) {
    // 1. Empêcher l'ouverture du modal d'édition
    event.stopPropagation();
    
    if (!id) return;

    if (!confirm("Voulez-vous transformer ce devis en facture ?")) {
        return;
    }

    // Feedback visuel sur le bouton
    const btn = event.target.closest('button');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '...'; 
    btn.disabled = true;

    try {
        // 2. Appel API
        await API.post(`/ninja/quotes/${id}/convert`, {});
        
        alert("Succès ! Le devis a été converti.");

        // 3. Redirection vers l'onglet factures
        if (typeof switchTab === 'function') {
            switchTab('invoices');
        } else {
            window.location.reload();
        }
        
    } catch (error) {
        alert("Erreur lors de la conversion : " + error.message);
        // Restauration du bouton en cas d'erreur
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

async function openInvoiceModal(invoice = null) {
    const modal = document.getElementById('invoice-modal');
    const form = document.getElementById('invoice-form');
    const select = document.getElementById('invoice-client-id');
    const dateInput = document.getElementById('invoice-date');
    const notesInput = document.getElementById('invoice-public-notes');
    const idInput = document.getElementById('invoice-id');
    const linesContainer = document.getElementById('invoice-lines-container');
    const btnSave = form.querySelector('.btn-save');

    // 1. Reset
    form.reset();
    linesContainer.innerHTML = ''; 
    
    // 2. Mode Création et Édition
    if (invoice) {
        document.querySelector('#invoice-modal h3').textContent = "Modifier Facture " + invoice.number;
        btnSave.textContent = "Mettre à jour";
        idInput.value = invoice.id;
        dateInput.value = invoice.date; 
        notesInput.value = invoice.public_notes || '';
    } else {
        document.querySelector('#invoice-modal h3').textContent = "Nouvelle Facture";
        btnSave.textContent = "Enregistrer Facture";
        idInput.value = ''; 
        dateInput.valueAsDate = new Date();
    }

    modal.classList.add('active');

    // 3. Charger les Clients (même logique que pour les devis)
    select.innerHTML = '<option value="">Chargement...</option>';
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

    select.innerHTML = '<option value="">-- Choisir un client --</option>';
    clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });

    // 4. Pré-remplir si c'est une édition
    if (invoice) {
        select.value = invoice.client_id;
        if (invoice.line_items && invoice.line_items.length > 0) {
            invoice.line_items.forEach(line => addInvoiceLine(line));
        } else {
             addInvoiceLine(); 
        }
    } else {
        addInvoiceLine();
    }
}

function closeInvoiceModal() {
    document.getElementById('invoice-modal').classList.remove('active');
}

// Ajouter une ligne visuelle pour Facture
window.addInvoiceLine = function(data = null) {
    const container = document.getElementById('invoice-lines-container');
    const div = document.createElement('div');
    // On réutilise le style CSS des devis
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

// Soumission Formulaire Facture
document.addEventListener('DOMContentLoaded', () => {
    const invForm = document.getElementById('invoice-form');
    if (invForm) {
        invForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = invForm.querySelector('.btn-save');
            const originalText = btn.textContent;
            btn.disabled = true; btn.textContent = "Sauvegarde...";

            // Récupération lignes
            const lineItems = [];
            // On utilise querySelectorAll sur LE formulaire courant pour éviter de prendre celles du modal Devis
            invForm.querySelectorAll('.quote-line-item').forEach(item => {
                const desc = item.querySelector('.line-desc').value;
                const cost = parseFloat(item.querySelector('.line-cost').value);
                const qty = parseFloat(item.querySelector('.line-qty').value);
                
                if (desc && (cost || cost === 0)) {
                    lineItems.push({ notes: desc, cost: cost, quantity: qty });
                }
            });

            if (lineItems.length === 0) {
                alert("Ajoutez au moins une ligne.");
                btn.disabled = false; btn.textContent = originalText;
                return;
            }

            const payload = {
                id: document.getElementById('invoice-id').value,
                client_id: document.getElementById('invoice-client-id').value,
                date: document.getElementById('invoice-date').value,
                public_notes: document.getElementById('invoice-public-notes').value,
                line_items: lineItems 
            };

            try {
                await API.post('/ninja/invoices', payload);
                closeInvoiceModal();
                loadInvoices(); 
            } catch (err) {
                alert("Erreur: " + err.message);
            } finally {
                btn.disabled = false; btn.textContent = originalText;
            }
        });
    }
});

// Suppression Facture
window.deleteInvoice = async function(event, id) {
    event.stopPropagation();
    if (!confirm("Supprimer cette facture ?")) return;

    const btn = event.target.closest('button');
    if(btn) btn.innerHTML = '...';

    try {
        await API.delete('/ninja/invoices/' + id);
        loadInvoices();
    } catch (error) {
        alert("Erreur : " + error.message);
        if(btn) btn.innerHTML = '🗑️';
    }
};

// Écouteur pour l'IA
window.addEventListener('iaDevisProposal', (event) => {
    const data = event.detail; // Contient { public_notes, line_items }
    
    // 1. Remplir les notes publiques
    const notesInput = document.getElementById('quote-public-notes');
    if (notesInput) notesInput.value = data.public_notes || '';

    // 2. Gérer les lignes de devis
    const container = document.getElementById('quote-lines-container');
    if (container) {
        container.innerHTML = ''; // On vide les lignes actuelles
        
        if (data.line_items && Array.isArray(data.line_items)) {
            data.line_items.forEach(item => {
                // On appelle la fonction existante addQuoteLine définie dans documents.js
                // Elle accepte un objet : { notes, cost, quantity }
                addQuoteLine(item);
            });
        }
    }
    
    console.log("✅ Devis mis à jour par l'IA");
});