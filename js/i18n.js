
const i18n = {
    async init() {
        // 1. Détecter la langue : 
        // Priorité 1 : Choix manuel stocké (localStorage)
        // Priorité 2 : Langue du navigateur (navigator.language)
        // Priorité 3 : Français par défaut
        const browserLang = navigator.language ? navigator.language.split('-')[0] : 'fr';
        const lngToLoad = localStorage.getItem('applicompta_lang') || browserLang || 'fr';

        await i18next
            .use(i18nextHttpBackend)
            .init({
                lng: lngToLoad, 
                fallbackLng: 'fr',
                load: 'languageOnly', // Très important : transforme "en-US" en "en"
                debug: true, // Activez le debug pour voir les logs dans la console
                backend: {
                    loadPath: 'js/lang/{{lng}}.json',
                }
            });

        console.log("🌍 Langue détectée et chargée :", i18next.language);
        this.translatePage();
    },

    t(key, options = {}) {
        if (!i18next.isInitialized) return key;
        const result = i18next.t(key, options);
        return result !== undefined ? result : key;
    },

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'OPTION') {
                el.textContent = this.t(key);
            } else {
                el.innerHTML = this.t(key);
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });
    },

    async changeLanguage(lang) {
        try {
            await i18next.changeLanguage(lang);
            localStorage.setItem('applicompta_lang', lang);
            console.log("🌍 Langue changée en :", lang);
            this.translatePage();
            // Update language selector if it exists
            const selector = document.getElementById('language-selector');
            if (selector) {
                selector.value = lang;
            }
        } catch (error) {
            console.error("Erreur lors du changement de langue:", error);
        }
    }
};
