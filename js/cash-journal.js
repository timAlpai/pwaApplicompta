window.cashJournal = (function() {

    // Cette fonction attache les clics aux boutons HTML
    function init() {
        console.log("🛠️ Initialisation des boutons de caisse...");
        
        const addBtn = document.getElementById('cash-add-btn');
        if (addBtn) addBtn.onclick = () => this.openCashEntryModal();

        const syncBtn = document.getElementById('cash-sync');
        if (syncBtn) syncBtn.onclick = () => this.syncPending();

        const closeBtn = document.getElementById('cash-close');
        if (closeBtn) {
            closeBtn.onclick = async () => {
                const date = document.getElementById('cash-date').value;
                if (confirm(i18n.t('confirm_close_day') || "Clôturer la journée ?")) {
                    try {
                        await API.post('/cash-journal/close', { date });
                        alert(i18n.t('day_closed_success') || "Journée clôturée !");
                        this.loadJournal(date);
                    } catch (e) { alert(e.message); }
                }
            };
        }
        
        // Initialise la date du jour si elle est vide
        const dateInput = document.getElementById('cash-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().slice(0, 10);
            dateInput.onchange = () => this.loadJournal(dateInput.value);
        }
    }

    async function loadJournal(date) {
        const list = document.getElementById('cash-entries-list');
        list.innerHTML = `<p style="text-align:center; padding:20px;">${i18n.t('loading')}</p>`;
        
        try {
            const data = await API.get(`/cash-journal?date=${date}`);
            renderJournal(data);
            updateTotals(data.journal);
        } catch (err) {
            console.error('Error loading journal:', err);
            list.innerHTML = '';
        }
    }

    function renderJournal(data) {
        const list = document.getElementById('cash-entries-list');
        list.innerHTML = '';
        const entries = data.entries || [];
        if (entries.length === 0) {
            list.innerHTML = `<p style="text-align:center; padding:20px; opacity:0.5;">${i18n.t('no_entries') || 'Aucune entrée'}</p>`;
            return;
        }
        entries.forEach(e => {
            const div = document.createElement('div');
            div.className = 'client-item';
            div.innerHTML = `
                <div class="client-info">
                    <h4>${e.description || '---'}</h4>
                    <p>${e.datetime.split(' ')[1].substring(0, 5)} - ${e.payment_method || ''}</p>
                </div>
                <div class="client-balance ${e.type === 'out' ? 'negative' : ''}">
                    ${e.type === 'in' ? '+' : '-'}${parseFloat(e.amount).toFixed(2)} €
                </div>
            `;
            list.appendChild(div);
        });
    }

    function updateTotals(journal) {
        const container = document.getElementById('cash-totals');
        if (!journal) {
            container.innerHTML = `<div class="info-item">${i18n.t('cash_no_journal_today') || 'Pas de journal'}</div>`;
            return;
        }
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom:15px; width:100%;">
                <div class="info-item" style="background:white; padding:10px; border-radius:10px; text-align:center; border:1px solid #eee;">
                    <small style="color:#666;">${i18n.t('cash_opening_balance')}</small><br><strong style="color:#298AAB;">${journal.opening_balance} €</strong>
                </div>
                <div class="info-item" style="background:white; padding:10px; border-radius:10px; text-align:center; border:1px solid #eee;">
                    <small style="color:#666;">${i18n.t('cash_closing_balance')}</small><br><strong style="color:#249191;">${journal.closing_balance} €</strong>
                </div>
            </div>
        `;
    }

    function openCashEntryModal() {
        const modalEl = document.getElementById('cashEntryModal');
        if (!modalEl) return;
        const bsModal = new bootstrap.Modal(modalEl);
        document.getElementById('cash-entry-form').reset();
        document.getElementById('entry-datetime').value = new Date().toISOString().slice(0, 16);
        bsModal.show();

        document.getElementById('cash-entry-submit').onclick = async function() {
            const payload = {
                datetime: document.getElementById('entry-datetime').value,
                type: document.getElementById('entry-type').value,
                amount: parseFloat(document.getElementById('entry-amount').value || 0),
                description: document.getElementById('entry-desc').value,
                payment_method: document.getElementById('entry-method').value,
                source: 'pwa'
            };
            try {
                await API.post('/cash-journal/entries', payload);
                bsModal.hide();
                window.cashJournal.loadJournal(document.getElementById('cash-date').value);
            } catch (err) { alert(err.message); }
        };
    }

    // --- LE RETOUR : TRÈS IMPORTANT ---
    // On doit retourner 'init' ici pour qu'il soit accessible depuis l'extérieur
    return { 
        init, 
        loadJournal, 
        openCashEntryModal, 
        syncPending: () => console.log("Sync...") 
    };

})();