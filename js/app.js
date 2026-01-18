document.addEventListener('DOMContentLoaded', () => {
   const token = localStorage.getItem('applicompta_jwt');

    if (!token) {
        // PAS DE TOKEN : On montre le login, on ne fait RIEN d'autre
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('app-screen').style.display = 'none';
    } else {
        // TOKEN PRÉSENT : On lance l'app et SEULEMENT ICI on charge les ressources
        showApp();
        if (typeof loadNinjaResources === 'function') {
            loadNinjaResources(); 
        }
    }


    // 2. Gestion du login  (c'est la partie qui manquait pour éviter la boucle)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            // Arrête le rechargement de la page
            e.preventDefault(); 
            
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const errorMsg = document.getElementById('error-msg');
            const btn = loginForm.querySelector('button');

            const username = usernameInput.value;
            const password = passwordInput.value;

            try {
                // UI Feedback
                btn.disabled = true;
                btn.textContent = "Connexion...";
                errorMsg.textContent = "";

                // Appel API (via api.js)           
                const response = await API.post('/auth/login', { 
                    username: username, 
                    password: password 
                });

                // Si on arrive ici, c'est que l'API a répondu 200 OK
                if (response.token) {
                    localStorage.setItem('applicompta_jwt', response.token);
                    if(response.user) {
                        localStorage.setItem('applicompta_user', JSON.stringify(response.user));
                    }
                    
                    // On vide les champs pour la sécurité
                    usernameInput.value = '';
                    passwordInput.value = '';
                    
                    // On lance l'application
                    showApp();
                } else {
                    throw new Error("Token manquant dans la réponse");
                }

            } catch (error) {
                console.error("Login error:", error);
                errorMsg.textContent = error.message || "Identifiants incorrects";
                localStorage.removeItem('applicompta_jwt'); // Nettoyage au cas où
            } finally {
                btn.disabled = false;
                btn.textContent = "Connexion";
            }
        });
    }
});

// Affiche l'écran principal et initialise le Menu Hamburger
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    // Gestion du menu burger
    const btnMenu = document.getElementById('btn-menu');
    const dropdown = document.getElementById('main-dropdown');
    
    // Protection : on vérifie si les éléments existent (au cas où le HTML ne serait pas à jour)
    if (btnMenu && dropdown) {
        // Toggle Menu : on clone le noeud pour supprimer les anciens eventListeners si showApp est appelé plusieurs fois
        const newBtn = btnMenu.cloneNode(true);
        btnMenu.parentNode.replaceChild(newBtn, btnMenu);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        // 2. Fermer le menu si on clique ailleurs
        window.addEventListener('click', (e) => {
            if (!e.target.matches('#btn-menu') && !newBtn.contains(e.target)) {
                if (dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            }
        });
    }

    // Gestion du lien Profil
    const linkProfile = document.getElementById('link-profile');
    if (linkProfile) {
        linkProfile.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('settings');
            if(dropdown) dropdown.classList.remove('show');
        });
    }

    // Gestion du lien Déconnexion
    const linkLogout = document.getElementById('link-logout');
    if (linkLogout) {
        linkLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm("Se déconnecter ?")) {
                localStorage.removeItem('applicompta_jwt');
                localStorage.removeItem('applicompta_user');
                window.location.reload(); // Recharger proprement la page
            }
        });
    }

    // Charger l'onglet par défaut (Clients)
    switchTab('clients');
}

// Fonction globale pour changer d'onglet
window.switchTab = function(tabName) {
    // Gestion Active Class (menu du bas)
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeBtn = document.querySelector(`.nav-item[onclick="switchTab('${tabName}')"]`);
    if(activeBtn) activeBtn.classList.add('active');

    // Gestion des Vues (Afficher/cacher les div)
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const activeView = document.getElementById(`view-${tabName}`);
    if(activeView) activeView.style.display = 'block';

    const titles = { 'clients': 'Clients', 'settings': 'Ma Société' };
    const pageTitle = document.getElementById('page-title');
    if(pageTitle) pageTitle.textContent = titles[tabName] || 'Applicompta';

    // Chargement des données spécifiques
    if (tabName === 'clients') {
        if(typeof loadClients === 'function') loadClients(); 
    } else if (tabName === 'settings') {
        if(typeof fetchNinjaAccount === 'function') fetchNinjaAccount();
    }
    else if (tabName === 'quotes') {
        if(typeof loadQuotes === 'function') loadQuotes(); // Nouveau
    } else if (tabName === 'invoices') {
        if(typeof loadInvoices === 'function') loadInvoices(); // Nouveau
    } else if (tabName === 'expenses') {
        console.log("Chargement des dépenses...");
        // Appel d'une future fonction loadExpenses()
    }
};