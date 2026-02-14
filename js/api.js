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
    
    // RÉCUPÉRATION DE LA LANGUE (depuis le stockage ou le navigateur)
    const currentLang = localStorage.getItem('applicompta_lang') || navigator.language.slice(0, 2) || 'fr';

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': currentLang, // <--- C'EST ICI QUE ÇA SE PASSE
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
    if (response.status === 401) {
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
          data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Erreur API inconnue');
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
    const ok = await demanderConfirmation(i18n.t("email_send_confirmation"));
    if(!ok) return;
    
    const btn = event.target.closest('button');
    btn.innerHTML = '...';
    
    try {
      await API.post(`/ninja/quotes/${id}/send`, {});
      
      
      btn.innerHTML = '✉️';
      
      // Nouvelle version : à tester 
      afficherSuccesEmail(i18n.t("email_send_success"));     
    } catch (err) {
       /* alert("Erreur d'envoi : " + err.message);
        btn.innerHTML = '✉️';*/

        afficherErreurEmail(i18n.t("email_missing_error"));
    }
};

// --- Modale affichant un message de succès si l'e-mail est envoyé
const afficherSuccesEmail = (message) => {
    const overlay = document.createElement('div');

    /* ANCIENNE VERSION
    overlay.setAttribute('style', `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Segoe UI', Roboto, sans-serif;
    `);

    overlay.innerHTML = `
        <div class="modal-success-card">
            <!-- Cercle avec encoche succès -->
            <div class="modal-success-header">
                <div class="modal-success-icon">✓</div>
            </div>
            
            <div class="modal-success-body">
                <h3 class="modal-success-title">Envoi réussi !</h3>
                <p class="modal-success-text">${message}</p>
                
                <button id="modal-close-success" class="modal-success-btn">
                    Génial !
                </button>
            </div>
        </div>
    `;*/

    // On applique le nouveau nom de classe unique
    overlay.className = 'modal-screen-wrapper';

    overlay.innerHTML = `
        <div class="modal-success-card">
            <div class="modal-success-header">
                <div class="modal-success-icon">✓</div>
            </div>
            
            <div class="modal-success-body">
                <h3 class="modal-success-title">${i18n.t("email_send_success_title")}</h3>
                <p class="modal-success-text">${message}</p>
                
                <button id="modal-close-success" class="modal-success-btn">
                    ${i18n.t("btn_great")}
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

    /* Ancienne version 
    overlay.setAttribute('style', `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Segoe UI', Roboto, sans-serif;
    `);

    overlay.innerHTML = `
        <div class="modal-error-card">
          <div class="modal-error-header">
              <span>⚠️</span> ACTION IMPOSSIBLE
          </div>
            
          <div class="modal-error-body">
              <div class="modal-error-alert">
                  ${message}
              </div>
              <p class="modal-error-instruction">
                  Veuillez ajouter un email au contact dans <strong>nouvelle passerelle</strong>.
              </p>
              
              <button id="modal-close-error" class="modal-error-btn">
                  Fermer
              </button>
          </div>
       </div>
    `;*/

    // On applique simplement la classe CSS définie plus haut
    overlay.className = 'modal-overlay';

    // Ensuite, tu injectes le contenu HTML que nous avons préparé précédemment
    overlay.innerHTML = `
        <div class="modal-card">
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

        /* ANCIENNE VERSION
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
        `;*/

        overlay.className = 'modal-container';

        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-icon">✉️</div>
                <p class="modal-text">${message}</p>
                <div class="modal-footer">
                    <button id="modal-cancel" class="modal-btn modal-btn-cancel">${i18n.t("btn_cancel")}</button>
                    <button id="modal-confirm" class="modal-btn modal-btn-confirm">${i18n.t("btn_confirm")}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#modal-confirm').onclick = () => { document.body.removeChild(overlay); resolve(true); };
        overlay.querySelector('#modal-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
    });
};

