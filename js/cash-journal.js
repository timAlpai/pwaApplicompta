window.cashJournal = (function() {

    // --- Fonctions privées ---

    async function loadJournal(date) {
        const dateToLoad = date || document.getElementById('cash-date').value;
        try {
            const data = await API.get(`/cash-journal?date=${dateToLoad}`);
            renderJournal(data);
            updateTotals(data.journal);
        } catch (err) {
            console.error('Error loading journal:', err);
        }
    }

function renderJournal(data) {
    const list = document.getElementById('cash-entries-list');
    list.innerHTML = '';
    const entries = data.entries || [];

    entries.forEach(e => {
        const isStorno = e.status === 'storno';
        // CORRECTION ICI : On vérifie si la ligne a déjà été annulée via l'info du PHP
        const canCancel = !isStorno && parseInt(e.is_already_cancelled) === 0;

        const div = document.createElement('div');
        div.className = 'client-item';
        
        if (isStorno) div.style.opacity = "0.5";

        div.innerHTML = `
            <div class="client-info">
                <h4>${e.description || '---'}</h4>
                <p>${e.datetime.split(' ')[1].substring(0, 5)} - ${e.payment_method || ''}</p>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="client-balance ${e.amount < 0 ? 'negative' : ''}">
                    ${parseFloat(e.amount).toFixed(2)} €
                </div>
                <!-- ON UTILISE canCancel ICI -->
                ${canCancel ? `
                    <button class="btn-icon-list" 
                            onclick="window.cashJournal.cancelEntry(${e.id})" 
                            style="background:#ffeaea; color:red; width:30px; height:30px; font-size:14px;">
                        ✕
                    </button>
                ` : ''}
            </div>
        `;
        list.appendChild(div);
    });
}
async function cancelEntry(id) {
    if (!confirm(i18n.t('confirm_cancel_entry') || "Annuler cette opération ?")) return;
    
   const stornoUuid = self.crypto.randomUUID();
    
    try {
        // On passe l'uuid en paramètre de l'URL (query param)
        await API.delete(`/cash-journal/entries/${id}?uuid=${stornoUuid}`); 
        window.cashJournal.loadJournal(); 
    } catch (err) {
        alert("Erreur : " + err.message);
    }
}

    function updateTotals(journal) {
        const container = document.getElementById('cash-totals');
        if (!journal) {
            container.innerHTML = `<div class="info-item" style="text-align:center; padding:10px;">${i18n.t('cash_no_journal_today')}</div>`;
            return;
        }
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom:15px; width:100%;">
                <div class="info-item" style="background:white; padding:10px; border-radius:10px; text-align:center; border:1px solid #eee;">
                    <small style="color:#666;">${i18n.t('cash_opening_balance')}</small><br><strong>${parseFloat(journal.opening_balance).toFixed(2)} €</strong>
                </div>
                <div class="info-item" style="background:white; padding:10px; border-radius:10px; text-align:center; border:1px solid #eee;">
                    <small style="color:#666;">${i18n.t('cash_closing_balance')}</small><br><strong style="color:#249191;">${parseFloat(journal.closing_balance).toFixed(2)} €</strong>
                </div>
            </div>
        `;
    }

    // --- Fonctions Publiques ---

    function openCashEntryModal() {
        const modalEl = document.getElementById('cashEntryModal');
        if (!modalEl) return;

        document.getElementById('cash-entry-form').reset();
        
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('entry-datetime').value = now.toISOString().slice(0, 16);

        modalEl.classList.add('active');

        document.getElementById('cash-entry-form').onsubmit = async function(e) {
            e.preventDefault();
            
            const payload = {
                 uuid: self.crypto.randomUUID(), 
                datetime: document.getElementById('entry-datetime').value,
                type: document.getElementById('entry-type').value,
                amount: parseFloat(document.getElementById('entry-amount').value || 0),
                description: document.getElementById('entry-desc').value,
                payment_method: document.getElementById('entry-method').value,
                source: 'pwa'
            };

            try {
                await API.post('/cash-journal/entries', payload);
                closeCashEntryModal(); // Utilisation de la fonction interne
                loadJournal(document.getElementById('cash-date').value);
            } catch (err) { 
                alert("Erreur : " + err.message); 
            }
        };
    }

    // FONCTION SORTIE ET RENDUE PUBLIQUE
    function closeCashEntryModal() {
        const modalEl = document.getElementById('cashEntryModal');
        if (modalEl) modalEl.classList.remove('active');
    }

    async function closeDay() {
        const date = document.getElementById('cash-date').value;
        if (confirm(i18n.t('confirm_close_day') || "Clôturer la journée ?")) {
            try {
                await API.post('/cash-journal/close', { date });
                alert(i18n.t('day_closed_success') || "Journée clôturée !");
                loadJournal(date);
            } catch (e) { alert(e.message); }
        }
    }

    // On retourne les fonctions pour qu'elles soient accessibles via window.cashJournal.xxxx
    return { 
        loadJournal, 
        openCashEntryModal, 
        closeCashEntryModal, 
        closeDay, 
        cancelEntry,
        syncPending: () => alert("Synchronisation...") 
    };

})();