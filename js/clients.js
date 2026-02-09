// Variable globale clients
let clientsList = [];

async function loadClients() {
    const listContainer = document.getElementById('clients-list');
    listContainer.innerHTML = '<p style="text-align:center">Chargement...</p>';

    try {
        const response = await API.get('/ninja/clients');
        // Ninja v5 renvoie { data: [...] }
        clientsList = response.data || [];
        renderClients(clientsList);
    } catch (error) {
        listContainer.innerHTML = `<p style="color:red">Erreur: ${error.message}</p>`;
    }
}

function renderClients(clients) {
    const container = document.getElementById('clients-list');
    container.innerHTML = '';

    if (clients.length === 0) {
        container.innerHTML = '<p style="text-align:center">Aucun client trouvé.</p>';
        return;
    }

    clients.forEach(client => {
        const div = document.createElement('div');
        div.className = 'client-item';
        // Solde = paid_to_date - total (ou balance field si dispo)
        const balance = parseFloat(client.balance || 0).toFixed(2);
        
        div.innerHTML = `
            <div class="client-info">
                <h4>${client.name}</h4>
                <p>${client.id_number || ''}</p>
            </div>
            <div class="client-balance ${balance > 0 ? 'negative' : ''}">${balance} €</div>
        `;
        div.onclick = () => openClientModal(client);
        container.appendChild(div);
    });
}

function openClientModal(client = null) {
    const modal = document.getElementById('client-modal');
    const title = document.getElementById('client-modal-title');
    const btnSave = document.querySelector('#client-modal .btn-save');
    
    if (!modal) return;

    // Reset du formulaire
    document.getElementById('client-form').reset();

    // Remplissage des champs de base
    document.getElementById('client-id').value = client ? client.id : '';
    document.getElementById('client-name').value = client ? client.name : '';
    document.getElementById('client-vat').value = client ? client.id_number : '';
    
    // --- LOGIQUE DE SÉLECTION DU MEILLEUR CONTACT ---
    let contact = {};
    if (client && client.contacts && client.contacts.length > 0) {
        const contactsWithEmail = client.contacts.filter(c => c.email && c.email.trim() !== "");
        if (contactsWithEmail.length > 0) {
            const primary = contactsWithEmail.find(c => c.is_primary);
            contact = primary || contactsWithEmail[0];
        } else {
            const absolutePrimary = client.contacts.find(c => c.is_primary);
            contact = absolutePrimary || client.contacts[0];
        }
    }

    // Remplissage des champs Contact
    document.getElementById('client-first-name').value = contact.first_name || '';
    document.getElementById('client-last-name').value = contact.last_name || '';
    document.getElementById('client-email').value = contact.email || '';
    document.getElementById('client-phone').value = contact.phone || '';

    // Mise à jour visuelle du titre et du bouton
    title.textContent = client ? "Modifier la fiche client" : "Créer un nouveau client";
    if (btnSave) btnSave.textContent = client ? "Mettre à jour" : "Créer le client";

    // Activation
    modal.classList.add('active');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.remove('active');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.remove('active');
}

// Gestion soumission formulaire client
document.getElementById('client-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-save');
    btn.disabled = true; btn.textContent = "Sauvegarde...";

    const payload = {
        client_id: document.getElementById('client-id').value,
        name: document.getElementById('client-name').value,
        id_number: document.getElementById('client-vat').value,
        first_name: document.getElementById('client-first-name').value,
        last_name: document.getElementById('client-last-name').value,
        email: document.getElementById('client-email').value,
        phone: document.getElementById('client-phone').value
    };

    try {
        await API.post('/ninja/clients', payload);
        closeClientModal();
        loadClients(); // Recharger la liste
    } catch (err) {
        alert("Erreur: " + err.message);
    } finally {
        btn.disabled = false; btn.textContent = "Enregistrer";
    }
});