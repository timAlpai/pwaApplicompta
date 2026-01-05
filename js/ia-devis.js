// js/ia-devis.js

document.addEventListener('DOMContentLoaded', () => {
  const modalChat = document.getElementById('modalChatIA');
  const btnOpen = document.getElementById('btn-ia-devis');
  const spanClose = modalChat.querySelector('.close');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const btnSend = document.getElementById('btnSendIA');
  const btnUse = document.getElementById('btnUseProposal');

  let lastProposal = null;

  // Ouvrir le modal IA
  if (btnOpen) {
    btnOpen.onclick = () => {
      chatMessages.innerHTML = '';
      lastProposal = null;
      btnUse.disabled = true;
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

    try {
      const response = await API.post('/ia/devis', { prompt: message });
      const iaReply = response.proposal || response.message || 'Désolé, je n’ai pas compris.';
      // Stocke la réponse complète (JSON si possible)
      lastProposal = response; 
      addMessage('ia', iaReply);
      btnUse.disabled = false;
    } catch (err) {
      addMessage('ia', 'Erreur : ' + (err.message || 'Impossible de contacter l’IA.'));
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