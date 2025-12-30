const API = {
    async request(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('applicompta_jwt');
       if (!token && !endpoint.includes('/auth/login')) {
            throw new Error("Non connecté");
        }
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${CONFIG.API_URL}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Erreur API');
        return data;
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, body) { return this.request(endpoint, 'POST', body); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};