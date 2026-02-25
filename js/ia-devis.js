// js/ia-devis.js

document.addEventListener('DOMContentLoaded', () => {
  const modalChat = document.getElementById('modalChatIA');
  const btnOpen = document.getElementById('btn-ia-devis');
  const spanClose = modalChat.querySelector('.close');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const langSelect = document.getElementById('ia-language-selector');
  const btnSend = document.getElementById('btnSendIA');
  const btnUse = document.getElementById('btnUseProposal');

  let lastProposal = null;

  // Ouvrir le modal IA
  if (btnOpen) {
    btnOpen.onclick = () => {
      chatMessages.innerHTML = '';
      lastProposal = null;
      btnUse.disabled = true;
      // remettre le sélecteur sur la langue courante si possible
      if (langSelect) {
        langSelect.value = localStorage.getItem('applicompta_lang') || (i18n.language || 'fr');
      }
      modalChat.style.display = 'block';
    };
  }

  // Fermer
  if (spanClose) spanClose.onclick = () => modalChat.style.display = 'none';
  window.onclick = (e) => { if (e.target === modalChat) modalChat.style.display = 'none'; };

  // Envoyer un message
  btnSend.onclick = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    // Afficher message utilisateur
    addMessage('user', message);
    chatInput.value = '';
    btnSend.disabled = true;

    // récupérer la langue cible (ou celle de l'application par défaut)
    const targetLang = langSelect ? langSelect.value : (localStorage.getItem('applicompta_lang') || (i18n.language || 'fr'));

     try {
      const response = await API.post('/ia/devis', { prompt: message, lang: targetLang });
      
      if (response.success && response.data) {
        lastProposal = response.data; // On stocke l'objet JSON (public_notes + line_items)
        
        // résumé en zone de chat (on pourrait aussi préciser la langue choisie)
        // build a more readable summary of the proposal
        let summary = i18n.t('ia_proposal_generated') + '\n\n';
        if (lastProposal.public_notes) {
          summary += lastProposal.public_notes + '\n\n';
        }
        summary += lastProposal.line_items.map((item, idx) => {
          return `${idx+1}. ${item.notes}  (${item.quantity} × ${item.cost})`;
        }).join('\n');
        addMessage('ia', summary);
        btnUse.disabled = false;
      }
    }  catch (err) {
      addMessage('ia', i18n.t('error_prefix') + ': ' + (err.message || i18n.t('ia_contact_error')));
    } finally {
      btnSend.disabled = false;
    }
  };

  // Utiliser la proposition : fermer et transmettre au modal devis
  btnUse.onclick = () => {
    if (lastProposal) {
      // Événement custom pour notifier le modal devis
      const event = new CustomEvent('iaDevisProposal', { detail: lastProposal });
      window.dispatchEvent(event);
    }
    modalChat.style.display = 'none';
  };

  function addMessage(sender, text) {
    const div = document.createElement('div');
    div.className = sender;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});