document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialisation
    if (!localStorage.getItem('applicompta_jwt')) {
        document.getElementById('login-screen').style.display = 'block';
    } else {
        showApp();
    }
});

// Affiche l'écran principal
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    // Attacher l'événement déconnexion au bouton du Header principal
    document.getElementById('btn-logout').addEventListener('click', () => {
        if(confirm("Se déconnecter ?")) {
            localStorage.removeItem('applicompta_jwt');
            localStorage.removeItem('applicompta_user');
            location.reload();
        }
    });

    // Charger l'onglet par défaut (Clients)
    switchTab('clients');
}

// Fonction globale pour changer d'onglet
window.switchTab = function(tabName) {
    // A. Gestion Active Class (Menu bas)
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    // Sélecteur simple basé sur l'attribut onclick (plus robuste que l'index)
    const activeBtn = document.querySelector(`.nav-item[onclick="switchTab('${tabName}')"]`);
    if(activeBtn) activeBtn.classList.add('active');

    // B. Gestion Vues (Afficher/Cacher les div)
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const activeView = document.getElementById(`view-${tabName}`);
    if(activeView) activeView.style.display = 'block';

    // C. Titre
    const titles = { 'clients': 'Clients', 'settings': 'Ma Société' };
    document.getElementById('page-title').textContent = titles[tabName] || 'Applicompta';

    // D. Chargement des données spécifiques
    if (tabName === 'clients') {
        if(typeof loadClients === 'function') loadClients(); // Dans js/clients.js
    } else if (tabName === 'settings') {
        if(typeof fetchNinjaAccount === 'function') fetchNinjaAccount(); // Dans js/settings.js
    }
};