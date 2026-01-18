// js/api.js – version avec auto-refresh silencieux

const API = {
  // Fonction interne pour rafraîchir le token
  async refreshToken() {
    const oldToken = localStorage.getItem('applicompta_jwt');
    if (!oldToken) return false;

    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oldToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        // Si le refresh échoue → on nettoie et on redirige
        this.redirectToLogin();
        return false;
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('applicompta_jwt', data.token);
        console.log('✅ Token rafraîchi automatiquement');
        return true;
      }
    } catch (err) {
      console.error('Erreur refresh token:', err);
    }
    this.redirectToLogin();
    return false;
  },

redirectToLogin() {
    localStorage.removeItem('applicompta_jwt');
    localStorage.removeItem('applicompta_user');
    
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');

    if (loginScreen && loginScreen.style.display === 'block') {
        // On est déjà sur le login, on ne recharge pas pour éviter la boucle
        return;
    }

    // Sinon, on fait un reset propre
    window.location.href = window.location.pathname; 
  },
  async request(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('applicompta_jwt');
    if (!token && !endpoint.includes('/auth/login')) {
      this.redirectToLogin();
      throw new Error("Non connecté");
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const options = { method, headers, cache: 'no-store' };
    if (body) options.body = JSON.stringify(body);

    let url = `${CONFIG.API_URL}${endpoint}`;
    if (method === 'GET') {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}_t=${new Date().getTime()}`;
    }

    let response = await fetch(url, options);
    let data;

    // Si 401/403 → tentative de refresh
    if (response.status === 401 || response.status === 403) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Réessayer la requête avec le nouveau token
        const newToken = localStorage.getItem('applicompta_jwt');
        const newOptions = {
          ...options,
          headers: { ...headers, 'Authorization': `Bearer ${newToken}` }
        };
        response = await fetch(url, newOptions);
        if (!response.ok) {
          throw new Error('Erreur après rafraîchissement');
        }
        data = await response.json();
      } else {
        throw new Error('Session expirée');
      }
    } else {
      if (!response.ok) {
        data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Erreur API inconnue');
      }
      data = await response.json();
    }

    return data;
  },

  get(endpoint) { return this.request(endpoint, 'GET'); },
  post(endpoint, body) { return this.request(endpoint, 'POST', body); },
  delete(endpoint) { return this.request(endpoint, 'DELETE'); }
};