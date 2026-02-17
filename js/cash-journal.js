const cashJournal = (function(){
    const apiBase = '/wp-json/applicompta/v1';

    async function loadJournal(date) {
        try {
            const res = await fetch(`${apiBase}/cash-journal?date=${date}`, { credentials: 'include' });
            const ct = res.headers.get('content-type') || '';
            if (!res.ok) {
                const text = await res.text();
                console.error('Failed to load journal:', res.status, text);
                renderJournal({ date, journal: null, entries: [] });
                return;
            }
            let data = null;
            if (ct.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                try { data = JSON.parse(text); } catch (e) { data = null; }
            }
            if (!data) {
                console.error('Invalid JSON response for cash journal:', await res.text());
                renderJournal({ date, journal: null, entries: [] });
                return;
            }
            if (data.success) {
                renderJournal(data);
            } else {
                console.warn('cash-journal responded without success:', data);
                renderJournal({ date, journal: data.journal || null, entries: data.entries || [] });
            }
        } catch (err) {
            console.error('Error loading journal:', err);
            renderJournal({ date, journal: null, entries: [] });
        }
    }

    function renderJournal(data) {
        const list = document.getElementById('cash-entries-list');
        list.innerHTML = '';
        const entries = data.entries || [];
        entries.forEach(e => {
            const div = document.createElement('div');
            div.className = 'cash-entry';
            div.innerHTML = `<div class="ce-left">${e.datetime}</div><div class="ce-right">${e.type} ${e.amount}</div>`;
            list.appendChild(div);
        });
    }

    async function createEntry(payload) {
        const res = await fetch(`${apiBase}/cash-journal/entries`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) return res.json();
        const text = await res.text();
        try { return JSON.parse(text); } catch (e) { return { success: false, error: text || 'invalid_response' }; }
    }

    async function closeJournal(date) {
        const res = await fetch(`${apiBase}/cash-journal/close`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date })
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) return res.json();
        const text = await res.text();
        try { return JSON.parse(text); } catch (e) { return { success: false, error: text || 'invalid_response' }; }
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
        if (!modalEl) return;
        const bsModal = new bootstrap.Modal(modalEl);
        // set defaults
        const dt = new Date().toISOString().slice(0,16);
        document.getElementById('entry-datetime').value = dt;
        document.getElementById('entry-amount').value = '';
        document.getElementById('entry-desc').value = '';
        document.getElementById('entry-method').value = '';
        document.getElementById('entry-type').value = 'in';
        bsModal.show();

        document.getElementById('cash-entry-submit').onclick = async function() {
            const payload = {
                datetime: document.getElementById('entry-datetime').value,
                type: document.getElementById('entry-type').value,
                amount: parseFloat(document.getElementById('entry-amount').value || 0),
                description: document.getElementById('entry-desc').value,
                payment_method: document.getElementById('entry-method').value,
                source: 'pwa',
                uuid: 'local-' + Date.now()
            };

            try {
                const res = await createEntry(payload);
                if (res && res.success) {
                    bsModal.hide();
                    const dateVal = document.getElementById('cash-date').value;
                    await loadJournal(dateVal || new Date().toISOString().slice(0,10));
                } else {
                    // fallback to pending
                    pushPending(payload);
                    bsModal.hide();
                    alert('Saved offline. Will sync when online.');
                }
            } catch (err) {
                pushPending(payload);
                bsModal.hide();
                alert('Saved offline. Will sync when online.');
            }
        };
    }

    return { loadJournal, createEntry, closeJournal, syncPending, openCashEntryModal };
})();

// Init bindings (run immediately if DOM already loaded, or on DOMContentLoaded)
function initCashJournalBindings() {
    const dateInput = document.getElementById('cash-date');
    if (dateInput) {
        const today = new Date().toISOString().slice(0,10);
        dateInput.value = today;
        dateInput.addEventListener('change', () => cashJournal.loadJournal(dateInput.value));
        const syncBtn = document.getElementById('cash-sync');
        if (syncBtn) syncBtn.addEventListener('click', async () => { await cashJournal.syncPending(); await cashJournal.loadJournal(dateInput.value); });
        const closeBtn = document.getElementById('cash-close');
        if (closeBtn) closeBtn.addEventListener('click', async () => {
            const dateVal = dateInput.value;
            try {
                const res = await cashJournal.closeJournal(dateVal);
                if (res && res.success) {
                    await cashJournal.loadJournal(dateVal);
                    alert('Day closed');
                } else {
                    alert('Close failed');
                }
            } catch (err) {
                console.error('Close error', err);
                alert('Close failed');
            }
        });
        const addBtn = document.getElementById('cash-add-btn');
        if (addBtn) addBtn.addEventListener('click', () => cashJournal.openCashEntryModal());
        // attempt sync on load
        cashJournal.syncPending().then(() => cashJournal.loadJournal(today));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCashJournalBindings);
} else {
    initCashJournalBindings();
}

// expose helper
window.openCashEntryModal = function() { if (typeof cashJournal !== 'undefined' && cashJournal.openCashEntryModal) return cashJournal.openCashEntryModal(); };
