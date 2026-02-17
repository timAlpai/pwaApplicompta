window.cashJournal = (function(){
  async function loadJournal(date) {
    try {
        // Utilise API.get au lieu de fetch
        const data = await API.get(`/cash-journal?date=${date}`);
        if (data.success) {
            renderJournal(data);
            // Mise à jour des totaux dans l'UI
            if(data.journal) {
                document.getElementById('cash-totals').innerHTML = `
                    <div>${i18n.t('cash_opening_balance')}: ${data.journal.opening_balance}</div>
                    <div>${i18n.t('cash_total_in')}: ${data.journal.total_in}</div>
                    <div>${i18n.t('cash_total_out')}: ${data.journal.total_out}</div>
                    <div style="font-weight:bold;">${i18n.t('cash_closing_balance')}: ${data.journal.closing_balance}</div>
                `;
            }
        }
    } catch (err) {
        console.error('Error loading journal:', err);
    }
}

    function renderJournal(data) {
        const list = document.getElementById('cash-entries-list');
        list.innerHTML = '';
        const entries = data.entries || [];
        
        if (entries.length === 0) {
            list.innerHTML = `<p style="text-align:center; padding:20px; opacity:0.5;">${i18n.t('no_entries')}</p>`;
            return;
        }

        entries.forEach(e => {
            const div = document.createElement('div');
            div.className = `cash-entry-item ${e.type}`;
            div.innerHTML = `
                <div class="ce-info">
                    <span class="ce-time">${e.datetime.split(' ')[1].substring(0,5)}</span>
                    <span class="ce-desc">${e.description || '---'}</span>
                </div>
                <div class="ce-amount">${e.type === 'in' ? '+' : '-'}${parseFloat(e.amount).toFixed(2)} €</div>
            `;
            list.appendChild(div);
        });
    }

    function updateTotals(journal) {
        if(!journal) return;
        document.getElementById('cash-totals').innerHTML = `
            <div>${i18n.t('cash_opening_balance')}: ${parseFloat(journal.opening_balance).toFixed(2)}</div>
            <div>${i18n.t('cash_total_in')}: ${parseFloat(journal.total_in).toFixed(2)}</div>
            <div>${i18n.t('cash_total_out')}: ${parseFloat(journal.total_out).toFixed(2)}</div>
            <div style="font-weight:bold; color:var(--primary-color);">
                ${i18n.t('cash_closing_balance')}: ${parseFloat(journal.closing_balance).toFixed(2)}
            </div>
        `;
    }

    async function createEntry(payload) {
        try {
            return await API.post('/cash-journal/entries', payload);
        } catch (err) {
            // Logique offline si besoin
            pushPending(payload);
            throw err;
        }
    }

    // Offline queue in localStorage
    function pushPending(entry) {
        const key = 'cash_pending';
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.push(entry);
        localStorage.setItem(key, JSON.stringify(arr));
    }

    async function syncPending() {
        const key = 'cash_pending';
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        if (!arr.length) return;
        const succeeded = [];
        for (const e of arr) {
            try {
                const res = await createEntry(e);
                if (res && res.success) succeeded.push(e);
            } catch (err) {
                console.warn('sync failed', err);
            }
        }
        if (succeeded.length) {
            const remaining = arr.filter(a => !succeeded.includes(a));
            localStorage.setItem(key, JSON.stringify(remaining));
        }
    }

    function openCashEntryModal() {
        const modalEl = document.getElementById('cashEntryModal');
        const bsModal = new bootstrap.Modal(modalEl);
        
        // Reset form
        document.getElementById('cash-entry-form').reset();
        document.getElementById('entry-datetime').value = new Date().toISOString().slice(0,16);
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
                await createEntry(payload);
                bsModal.hide();
                loadJournal(document.getElementById('cash-date').value);
            } catch (err) {
                alert(i18n.t('saved_offline'));
                bsModal.hide();
            }
        };
    }

    return { loadJournal, createEntry, openCashEntryModal, syncPending };
})();