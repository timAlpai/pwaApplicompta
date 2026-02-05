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

window.sendQuoteEmail = async function(event, id) {
    event.stopPropagation();
    // Ancien code : Tim
    // if(!confirm("Envoyer le devis par email au client ?")) return;

    // Modale pour confirmation d'envoie d'email
    const ok = await demanderConfirmation("Envoyer le devis par email au client ?");
    if(!ok) return;
    
    const btn = event.target.closest('button');
    btn.innerHTML = '...';
    
    try {
      await API.post(`/ninja/quotes/${id}/send`, {});
      
      // Ancienne version : Tim
      alert("Email envoyé avec succès !");
      btn.innerHTML = '✉️';
      
      // Nouvelle version : à tester 
      afficherSuccesEmail("Le devis a été envoyé avec succès au client !");     
    } catch (err) {
       /* alert("Erreur d'envoi : " + err.message);
        btn.innerHTML = '✉️';*/

        afficherErreurEmail("Le client n’a aucune adresse email valide.");
    }
};

// --- Modale affichant un message de succès si l'e-mail est envoyé
const afficherSuccesEmail = (message) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('style', `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Segoe UI', Roboto, sans-serif;
    `);

    overlay.innerHTML = `
        <div style="margin-top:-150px; background: white; padding: 0; border-radius: 16px; text-align: center; width: 350px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #c6f6d5;">
            <!-- Cercle avec encoche succès -->
            <div style="background: #48bb78; color: white; padding: 25px;">
                <div style="font-size: 50px; line-height: 1;">✓</div>
            </div>
            
            <div style="padding: 30px;">
                <h3 style="margin: 0 0 10px 0; color: #2f855a; font-size: 18px;">Envoi réussi !</h3>
                <p style="margin: 0 0 25px 0; color: #4a5568; font-size: 14px; line-height: 1.5;">${message}</p>
                
                <button id="modal-close-success" style="width: 100%; padding: 12px; border: none; border-radius: 10px; background: #48bb78; color: white; cursor: pointer; font-weight: 600; transition: 0.2s; box-shadow: 0 4px 6px rgba(72, 187, 120, 0.2);">
                    Génial !
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Fermeture au clic sur le bouton
    overlay.querySelector('#modal-close-success').onclick = () => {
        document.body.removeChild(overlay);
    };

    // Auto-fermeture après 5 secondes si l'utilisateur ne clique pas
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }, 5000);
};

// Modale d'erreur pour l'envoie d'email 
const afficherErreurEmail = (message) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('style', `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Segoe UI', Roboto, sans-serif;
    `);

    overlay.innerHTML = `
        <div style="margin-top:-150px; background: white; padding: 0; border-radius: 12px; text-align: center; width: 350px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #feb2b2;">
            <!-- Barre de titre rouge style Danger -->
            <div style="background: #f56565; color: white; padding: 15px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 20px;">⚠️</span> ACTION IMPOSSIBLE
            </div>
            
            <div style="padding: 25px;">
                <div style="background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.5; font-weight: 500;">
                    ${message}
                </div>
                <p style="color: #4a5568; font-size: 13px; margin-bottom: 20px;">Veuillez ajouter un email au contact dans <strong>nouvelle passerelle</strong>.</p>
                
                <button id="modal-close-error" style="width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4a5568; color: white; cursor: pointer; font-weight: 600; transition: 0.2s;">
                    Fermer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#modal-close-error').onclick = () => {
        document.body.removeChild(overlay);
    };
};

// Modale pour la confirmation d'envoi d'email
const demanderConfirmation = (message) => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.setAttribute('style', `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center; z-index: 9999;
            font-family: 'Segoe UI', Roboto, sans-serif;
        `);

        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-icon">✉️</div>
                <p class="modal-footer">${message}</p>
                <div style="display: flex; gap: 10px;">
                    <button id="modal-cancel" class="modal-btn modal-btn-cancel">Annuler</button>
                    <button id="modal-confirm" class="modal-btn modal-btn-confirm">Confirmer</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#modal-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); };
        overlay.querySelector('#modal-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
    });
};

