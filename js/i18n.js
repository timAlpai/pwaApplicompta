// js/i18n.js
const i18n = {
    async init() {
        await i18next
            .use(i18nextHttpBackend) // Utilise le plugin pour charger les fichiers .json
            .init({
                lng: localStorage.getItem('applicompta_lang') || 'fr', // Langue par défaut
                fallbackLng: 'fr', // Langue de secours
                debug: false,
                backend: {
                    // Chemin vers vos fichiers de traduction
                    loadPath: 'js/lang/{{lng}}.json',
                }
            });

        this.translatePage();
    },

    // Traduire une clé manuellement dans le code JS
    t(key, options = {}) {
        return i18next.t(key, options);
    },

    // Traduire automatiquement tous les éléments HTML avec data-i18n
    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.innerHTML = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });
    },

    // Changer de langue
    async changeLanguage(lng) {
        await i18next.changeLanguage(lng);
        localStorage.setItem('applicompta_lang', lng);
        this.translatePage();
    }
};