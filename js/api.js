const API = {
    async request(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('applicompta_jwt');
       if (!token && !endpoint.includes('/auth/login')) {
            throw new Error("Non connecté");
        }
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            
        };

        const options = { method, headers, cache: 'no-store'  };
       if (body) options.body = JSON.stringify(body);

        // Petite astuce supplémentaire : ajout d'un timestamp si c'est un GET
        let url = `${CONFIG.API_URL}${endpoint}`;
        if (method === 'GET') {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}_t=${new Date().getTime()}`;
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Erreur API');
        return data;
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, body) { return this.request(endpoint, 'POST', body); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};