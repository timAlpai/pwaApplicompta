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
            <button class="btn-icon-list" onclick="sendQuoteEmail(event, '${doc.id}')" title="Envoyer par mail">✉️</button>
            <button class="btn-icon-list" onclick="convertQuote(event, '${doc.id}')" style="background:#eafaf1; color:#27ae60;" title="Convertir en facture">💶</button>
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

// --- MODALE POUR DEVIS NON SIGNÉ (STYLE WARNING / ORANGE) ---
window.afficherAlerteSignature = () => {
    const overlay = document.createElement('div');

    /* ANCIENNE VERSION
    overlay.setAttribute('style', `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Segoe UI', Roboto, sans-serif;
    `);

    overlay.innerHTML = `
        <div style="margin-top:-150px; background: white; padding: 0; border-radius: 16px; text-align: center; width: 360px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #fbd38d;">
            
            <!-- Barre de titre Orange (Warning) -->
            <div style="background: #ed8936; color: white; padding: 15px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 20px;">✍️</span> SIGNATURE REQUISE
            </div>
            
            <div style="padding: 30px;">
                <div style="background: #fffaf0; border: 1px solid #fbd38d; color: #9c4221; padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; line-height: 1.5; font-weight: 500; text-align: left;">
                    Ce devis n'a pas encore été signé électroniquement par le client. 
                    <br><br>
                    <strong>La conversion en facture est bloquée</strong> tant que le document n'est pas validé.
                </div>
                
                <button id="modal-close-sign" style="width: 100%; padding: 12px; border: none; border-radius: 10px; background: #ed8936; color: white; cursor: pointer; font-weight: 600; transition: 0.2s;">
                    J'ai compris
                </button>
            </div>
        </div>
    `;*/

    overlay.className = 'custom-modal-backdrop';

    overlay.innerHTML = `
        <div class="modal-sign-card">
            <div class="modal-sign-header">
                <span>✍️</span> SIGNATURE REQUISE
            </div>
            
            <div class="modal-sign-body">
                <div class="modal-sign-alert">
                    Ce devis n'a pas encore été signé électroniquement par le client. 
                    <br><br>
                    <strong>La conversion en facture est bloquée</strong> tant que le document n'est pas validé.
                </div>
                
                <button id="modal-close-sign" class="modal-sign-btn">
                    J'ai compris
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#modal-close-sign').onclick = () => {
        document.body.removeChild(overlay);
    };
    
    // Fermeture si on clique sur l'arrière-plan (optionnel)
    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };
};

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
                // Ancienne version Tim
                // alert("Ajoutez au moins une ligne au devis.");
                
                overlay.className = 'flow-modal-dimmer';

                overlay.innerHTML = `
                    <div class="flow-warning-card">
                        <div class="flow-warning-content">
                            <div class="flow-warning-header">
                                <span style="font-size: 24px;">📝</span>
                                <h3 class="flow-warning-title">Devis vide</h3>
                            </div>
                            <p class="flow-warning-text">
                                Oups ! Vous ne pouvez pas enregistrer un devis sans articles. 
                                <strong>Ajoutez au moins une ligne</strong> pour continuer.
                            </p>
                            <button id="flow-close-warning" class="flow-warning-btn">
                                D'accord, je vais en ajouter
                            </button>
                        </div>
                    </div>
                `;

                // Fermeture de la modale
                document.getElementById('flow-close-warning').onclick = () => {
                    overlay.style.display = 'none';
                };
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
                // Ancienne version Tim 
                // alert("Erreur: " + err.message);

                overlay.className = 'ctrl-overlay';

                overlay.innerHTML = `
                    <div class="ctrl-card">
                        <div class="ctrl-header">
                            <div class="ctrl-status-dot"></div>
                            <h3 class="ctrl-title">Rapport d'erreur</h3>
                        </div>
                        <div class="ctrl-body">
                            <div class="ctrl-message-label">Le système a retourné l'exception suivante :</div>
                            <div class="ctrl-err-box">
                                ${err.message}
                            </div>
                            <button id="ctrl-close" class="ctrl-btn">
                                Ignorer et fermer
                            </button>
                        </div>
                    </div>
                `;

                // Fermeture du modal
                document.getElementById('ctrl-close').onclick = () => {
                    overlay.style.display = 'none';
                };
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

    /* Ancienne méhode : Tim 
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce devis définitivement ?")) {
        return;
    }*/

    const ok = await confirmerSuppression("Êtes-vous sûr de vouloir supprimer ce devis définitivement ?");   
    if (!ok) return;

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
        // Ancienne méthode : Tim
        // alert("Erreur lors de la suppression : " + error.message);

        // Nouvelle méthode : à tester 
        afficherErreur("Erreur lors de la suppression : " + error.message, "Échec de l'opération");

        // Si erreur, on remet l'icône
        if(btn) {
            btn.innerHTML = '🗑️';
            btn.disabled = false;
        }
    }
};

// Modale pour afficher les erreurs
const afficherErreur = (message, titre = "Erreur") => {
    const overlay = document.createElement('div');

    /* ANCIENNE VERSION
    overlay.setAttribute('style', `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10001;
        font-family: 'Segoe UI', Roboto, sans-serif;
    `);

    overlay.innerHTML = `
        <div style="margin-top:-150px; background: white; padding: 25px; border-radius: 16px; text-align: center; width: 340px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); border: 1px solid #feb2b2;">
            <div style="font-size: 40px; margin-bottom: 15px;">❌</div>
            <h3 style="margin: 0 0 10px 0; color: #c53030; font-size: 18px;">${titre}</h3>
            <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 14px; line-height: 1.4;">${message}</p>
            <button id="err-close" style="width: 100%; padding: 12px; border: none; border-radius: 10px; background: #4a5568; color: white; cursor: pointer; font-weight: 600; transition: 0.2s;">
                Fermer
            </button>
        </div>
    `;*/

    overlay.className = 'unique-modal-dimmer';

    overlay.innerHTML = `
        <div class="unique-error-card">
            <div class="unique-error-icon">❌</div>
            <h3 class="unique-error-title">${titre}</h3>
            <p class="unique-error-text">${message}</p>
            <button id="err-close" class="unique-error-btn">
                Fermer
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#err-close').onclick = () => { document.body.removeChild(overlay); };
};

// Modale affichant un message de confirmation de suppression
const confirmerSuppression = (message, titre = "Supprimer ?") => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        /* ANCIENNE VERSION
        overlay.setAttribute('style', `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center; z-index: 10000;
            font-family: 'Segoe UI', Roboto, sans-serif;
        `);

        overlay.innerHTML = `
            <div style="margin-top:-150px; background: white; padding: 25px; border-radius: 16px; text-align: center; width: 340px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); border: 1px solid #feb2b2;">
                <div style="font-size: 40px; margin-bottom: 15px;">🗑️</div>
                <!-- ICI LE TITRE DEVIENT VARIABLE -->
                <h3 style="margin: 0 0 10px 0; color: #c53030; font-size: 18px;">${titre}</h3>
                <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 14px; line-height: 1.4;">${message}</p>
                <div style="display: flex; gap: 10px;">
                    <button id="del-cancel" style="flex: 1; padding: 12px; border: none; border-radius: 10px; background: #edf2f7; color: #4a5568; cursor: pointer; font-weight: 600; transition: 0.2s;">Annuler</button>
                    <button id="del-confirm" style="flex: 1; padding: 12px; border: none; border-radius: 10px; background: #e53e3e; color: white; cursor: pointer; font-weight: 600; transition: 0.2s;">Supprimer</button>
                </div>
            </div>
        `;*/

        overlay.className = 'modal-view-overlay';

        overlay.innerHTML = `
            <div class="modal-delete-box">
                <div class="modal-delete-icon">🗑️</div>
                <h3 class="modal-delete-title">${titre}</h3>
                <p class="modal-delete-text">${message}</p>
                <div class="modal-delete-actions">
                    <button id="del-cancel" class="btn-base btn-cancel">Annuler</button>
                    <button id="del-confirm" class="btn-base btn-danger">Supprimer</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.querySelector('#del-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); };
        overlay.querySelector('#del-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
    });
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
        
        // Ancienne version Tim 
        // alert("Succès ! Le devis a été converti.");

        // On utilise le nouveau nom d'overlay
        overlay.className = 'nova-backdrop';

        overlay.innerHTML = `
            <div class="nova-convert-box">
                <div class="nova-icon-circle">📄</div>
                <h3 class="nova-title">Succès !</h3>
                <p class="nova-desc">Le devis a été converti en facture avec succès.</p>
                <button id="nova-close" class="nova-action-btn">
                    Voir la facture
                </button>
            </div>
        `;

        // Fermeture du modal
        document.getElementById('nova-close').onclick = () => {
            overlay.style.display = 'none';
};

        // 3. Redirection vers l'onglet factures
        if (typeof switchTab === 'function') {
            switchTab('invoices');
        } else {
            window.location.reload();
        }
        
    } catch (error) {
        // Ancienne version Tim 
        // alert("Erreur lors de la conversion : " + error.message);
       
        overlay.className = 'bolt-overlay-danger';

        overlay.innerHTML = `
            <div class="bolt-error-container">
                <div class="bolt-error-header">
                    <div class="bolt-error-circle">!</div>
                    <h3 class="bolt-error-title">Échec de conversion</h3>
                </div>
                <div class="bolt-error-body">
                    <p style="margin:0; color:#64748b; font-size:14px;">
                        Une erreur technique est survenue lors de la génération du document :
                    </p>
                    <div class="bolt-error-code">
                        ${error.message}
                    </div>
                    <button id="bolt-close-error" class="bolt-error-btn">
                        Fermer et corriger
                    </button>
                </div>
            </div>
        `;

        // Fermeture de la modale
        document.getElementById('bolt-close-error').onclick = () => {
            overlay.style.display = 'none';
        };

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

function closeInvoiceModal() {
    document.getElementById('invoice-modal').classList.remove('active');
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
                // Ancienne version Tim
                // alert("Ajoutez au moins une ligne.");

                overlay.className = 'orbit-dimmer';

                overlay.innerHTML = `
                    <div class="orbit-card">
                        <div class="orbit-icon-wrap">🛒</div>
                        <h3 class="orbit-title">Document vide</h3>
                        <p class="orbit-text">
                            Votre devis ne contient aucun article. Veuillez <strong>ajouter au moins une ligne</strong> pour pouvoir l'enregistrer.
                        </p>
                        <button id="orbit-close" class="orbit-btn">
                            Retour au devis
                        </button>
                    </div>
                `;

                // Fermeture du modal
                document.getElementById('orbit-close').onclick = () => {
                    overlay.style.display = 'none';
                };
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
                // Ancienne méthode Tim 
                // alert("Erreur: " + err.message);

                overlay.className = 'unique-modal-dimmer';

                overlay.innerHTML = `
                    <div class="unique-error-card">
                        <div class="unique-error-icon">❌</div>
                        <h3 class="unique-error-title">${titre}</h3>
                        <p class="unique-error-text">${message}</p>
                        <button id="err-close" class="unique-error-btn">
                            Fermer
                        </button>
                    </div>
`;
            } finally {
                btn.disabled = false; btn.textContent = originalText;
            }
        });
    }
});

// Suppression Facture
window.deleteInvoice = async function(event, id) {
    event.stopPropagation();
    
    // Ancienne méthode : Tim
    // if (!confirm("Supprimer cette facture ?")) return;

    const ok = await confirmerSuppression("Voulez-vous vraiment supprimer cette facture définitivement ?");
    if (!ok) return;

    const btn = event.target.closest('button');
    if(btn) btn.innerHTML = '...';

    try {
        await API.delete('/ninja/invoices/' + id);
        loadInvoices();
    } catch (error) {
        // Ancienne version Tim 
        // alert("Erreur : " + error.message);

        overlay.className = 'cyber-guard-overlay';

        overlay.innerHTML = `
            <div class="cyber-error-module">
                <div class="cyber-status-line"></div>
                <div class="cyber-body">
                    <span class="cyber-tag">CORE_SYSTEM_ERROR</span>
                    <div class="cyber-msg-box">
                        > ${error.message}
                    </div>
                    <button id="cyber-close" class="cyber-resolve-btn">
                        Acknowledge Error
                    </button>
                </div>
            </div>
        `;

        // Logique de fermeture
        document.getElementById('cyber-close').onclick = () => {
            overlay.style.display = 'none';
        };
        
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