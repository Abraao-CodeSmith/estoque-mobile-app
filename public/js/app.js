/**
 * Estoque Mobile App Frontend Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const totalItemsCount = document.getElementById('totalItemsCount');
  const productsGrid = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyState');
  const loadingSpinner = document.getElementById('loadingSpinner');

  // Botões e Modais
  const btnOpenAddModal = document.getElementById('btnOpenAddModal');
  const addModal = document.getElementById('addModal');
  const btnCloseAddModal = document.getElementById('btnCloseAddModal');

  const btnOpenExportModal = document.getElementById('btnOpenExportModal');
  const exportModal = document.getElementById('exportModal');
  const btnCloseExportModal = document.getElementById('btnCloseExportModal');

  // Wizard Passos
  const modalStepTitle = document.getElementById('modalStepTitle');
  const step1Content = document.getElementById('step1Content');
  const step2Content = document.getElementById('step2Content');
  const step3Content = document.getElementById('step3Content');

  const dotStep1 = document.getElementById('dotStep1');
  const dotStep2 = document.getElementById('dotStep2');
  const dotStep3 = document.getElementById('dotStep3');
  const lineStep1 = document.getElementById('lineStep1');
  const lineStep2 = document.getElementById('lineStep2');

  // Passo 1 - Imagem
  const cameraInput = document.getElementById('cameraInput');
  const galleryInput = document.getElementById('galleryInput');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const imageUploadButtons = document.getElementById('imageUploadButtons');
  const btnRemoveImage = document.getElementById('btnRemoveImage');
  const btnSkipStep1 = document.getElementById('btnSkipStep1');
  const btnNextStep1 = document.getElementById('btnNextStep1');

  // Passo 2 - Voz / IA
  const btnRecordAudio = document.getElementById('btnRecordAudio');
  const recordStatusText = document.getElementById('recordStatusText');
  const transcriptText = document.getElementById('transcriptText');
  const btnAnalyzeAI = document.getElementById('btnAnalyzeAI');
  const btnBackStep2 = document.getElementById('btnBackStep2');
  const btnSkipStep2 = document.getElementById('btnSkipStep2');
  const btnNextStep2 = document.getElementById('btnNextStep2');

  // Passo 3 - Formulário
  const inputCodigo = document.getElementById('inputCodigo');
  const inputProduto = document.getElementById('inputProduto');
  const inputQuantidade = document.getElementById('inputQuantidade');
  const inputCor = document.getElementById('inputCor');
  const btnBackStep3 = document.getElementById('btnBackStep3');
  const btnSaveProduct = document.getElementById('btnSaveProduct');

  // Elementos de Auth
  const authScreen = document.getElementById('authScreen');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const loginEmail = document.getElementById('loginEmail');
  const loginSenha = document.getElementById('loginSenha');
  const btnLogin = document.getElementById('btnLogin');
  const loginError = document.getElementById('loginError');
  const registerNome = document.getElementById('registerNome');
  const registerEmail = document.getElementById('registerEmail');
  const registerSenha = document.getElementById('registerSenha');
  const btnRegister = document.getElementById('btnRegister');
  const registerError = document.getElementById('registerError');
  const btnLogout = document.getElementById('btnLogout');

  // Exportação
  const btnExportDB = document.getElementById('btnExportDB');
  const btnExportExcel = document.getElementById('btnExportExcel');
  const btnExportCSV = document.getElementById('btnExportCSV');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  // Estado do Aplicativo
  let currentStep = 1;
  let selectedImageFile = null;
  let editingProductId = null;
  let isRecording = false;
  let isGlobalMicRecording = false;
  let recognition = null;
  let globalRecognition = null;
  let currentUser = null;

  // ==================== AUTENTICAÇÃO ====================

  // Recuperar token e usuário do localStorage
  function getToken() {
    return localStorage.getItem('estoque_token');
  }

  function saveSession(token, user) {
    localStorage.setItem('estoque_token', token);
    localStorage.setItem('estoque_user', JSON.stringify(user));
    currentUser = user;
  }

  function clearSession() {
    localStorage.removeItem('estoque_token');
    localStorage.removeItem('estoque_user');
    currentUser = null;
  }

  // Wrapper fetch que injeta o token JWT automaticamente
  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      clearSession();
      showAuthScreen();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    return res;
  }

  function showAuthScreen() {
    authScreen.classList.remove('hidden');
  }

  function hideAuthScreen() {
    authScreen.classList.add('hidden');
  }

  function initApp() {
    const token = getToken();
    const savedUser = localStorage.getItem('estoque_user');
    if (token && savedUser) {
      currentUser = JSON.parse(savedUser);
      hideAuthScreen();
      loadProducts();
    } else {
      showAuthScreen();
    }
  }

  // Alternar abas Login/Cadastro
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    loginError.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
    registerError.classList.add('hidden');
  });

  // Login
  formLogin.addEventListener('submit', async () => {
    loginError.classList.add('hidden');
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.value.trim(), senha: loginSenha.value })
      });
      const data = await res.json();

      if (data.success) {
        saveSession(data.token, data.user);
        hideAuthScreen();
        loginEmail.value = '';
        loginSenha.value = '';
        showToast(`Bem-vindo, ${data.user.nome}! 📦`, 'success');
        loadProducts();
      } else {
        loginError.textContent = data.error || 'Erro ao fazer login.';
        loginError.classList.remove('hidden');
      }
    } catch (err) {
      loginError.textContent = 'Erro de conexão com o servidor.';
      loginError.classList.remove('hidden');
    } finally {
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
    }
  });

  // Cadastro
  formRegister.addEventListener('submit', async () => {
    registerError.classList.add('hidden');
    btnRegister.disabled = true;
    btnRegister.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando conta...';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: registerNome.value.trim(),
          email: registerEmail.value.trim(),
          senha: registerSenha.value
        })
      });
      const data = await res.json();

      if (data.success) {
        saveSession(data.token, data.user);
        hideAuthScreen();
        registerNome.value = '';
        registerEmail.value = '';
        registerSenha.value = '';
        showToast(`Conta criada! Bem-vindo, ${data.user.nome}! 🎉`, 'success');
        loadProducts();
      } else {
        registerError.textContent = data.error || 'Erro ao criar conta.';
        registerError.classList.remove('hidden');
      }
    } catch (err) {
      registerError.textContent = 'Erro de conexão com o servidor.';
      registerError.classList.remove('hidden');
    } finally {
      btnRegister.disabled = false;
      btnRegister.innerHTML = '<i class="fa-solid fa-user-plus"></i> Criar Conta';
    }
  });

  // Logout
  btnLogout.addEventListener('click', () => {
    if (!confirm('Deseja sair da sua conta?')) return;
    clearSession();
    showToast('Você saiu da conta.', 'info');
    showAuthScreen();
    productsGrid.innerHTML = '';
    totalItemsCount.textContent = '⦾ 0 itens cadastrados';
  });

  // ==================== INICIALIZAÇÃO ====================
  initSpeechRecognition();
  initGlobalMicRecognition();
  initApp(); // Verifica sessão antes de carregar produtos


  // ==================== PESQUISA & LISTAGEM ====================
  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.trim() !== '') {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadProducts(val);
    }, 300);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    loadProducts();
  });

  async function loadProducts(searchQuery = '') {
    loadingSpinner.classList.remove('hidden');
    emptyState.classList.add('hidden');
    productsGrid.innerHTML = '';

    try {
      const url = searchQuery ? `/api/produtos?search=${encodeURIComponent(searchQuery)}` : '/api/produtos';
      const res = await authFetch(url);
      const data = await res.json();

      loadingSpinner.classList.add('hidden');

      if (data.success && data.data.length > 0) {
        renderProducts(data.data);
        totalItemsCount.innerHTML = `<i class="fa-solid fa-cubes"></i> ${data.data.length} item(ns) encontrado(s)`;
      } else {
        emptyState.classList.remove('hidden');
        totalItemsCount.innerHTML = `<i class="fa-solid fa-cubes"></i> 0 itens no estoque`;
      }
    } catch (err) {
      loadingSpinner.classList.add('hidden');
      if (err.message !== 'Sessão expirada. Faça login novamente.') {
        console.error('Erro ao carregar produtos:', err);
        showToast('Erro ao carregar produtos do servidor.', 'error');
      }
    }
  }

  function renderProducts(products) {
    productsGrid.innerHTML = products.map(p => {
      const imgHtml = p.imagem
        ? `<img src="${p.imagem}" alt="${escapeHtml(p.produto)}" class="product-thumb">`
        : `<div class="product-thumb"><i class="fa-solid fa-box"></i></div>`;

      const productJsonAttr = escapeHtml(JSON.stringify(p));

      return `
        <div class="product-card" data-id="${p.id}">
          ${imgHtml}
          <div class="product-info">
            <div class="product-title" title="${escapeHtml(p.produto)}">${escapeHtml(p.produto)}</div>
            <div class="product-meta">
              ${p.codigo ? `<span class="tag tag-code"><i class="fa-solid fa-barcode"></i> ${escapeHtml(p.codigo)}</span>` : ''}
              ${p.cor ? `<span class="tag tag-color"><i class="fa-solid fa-palette"></i> ${escapeHtml(p.cor)}</span>` : ''}
            </div>
            <div class="product-qty"><i class="fa-solid fa-layer-group"></i> Qtd: ${p.quantidade} un.</div>
          </div>
          <div class="card-actions">
            <button class="btn-edit-prod" data-product="${productJsonAttr}" onclick="handleEditClick(this)" title="Editar produto">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-delete-prod" onclick="deleteProduct(${p.id}, '${escapeHtml(p.produto).replace(/'/g, "\\'")}')" title="Excluir produto">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Editar Produto
  window.handleEditClick = (btn) => {
    try {
      const product = JSON.parse(btn.getAttribute('data-product'));
      editingProductId = product.id;

      inputCodigo.value = product.codigo || '';
      inputProduto.value = product.produto || '';
      inputQuantidade.value = product.quantidade || 1;
      inputCor.value = product.cor || '';

      if (product.imagem) {
        imagePreview.src = product.imagem;
        imagePreviewContainer.classList.remove('hidden');
        imageUploadButtons.classList.add('hidden');
      } else {
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        imageUploadButtons.classList.remove('hidden');
      }

      goToStep(3);
      modalStepTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Produto';
      addModal.classList.remove('hidden');
    } catch (e) {
      console.error('Erro ao carregar dados do produto para edição:', e);
    }
  };

  // Deletar Produto
  window.deleteProduct = async (id, name) => {
    if (!confirm(`Deseja realmente remover o produto "${name}" do estoque?`)) return;

    try {
      const res = await authFetch(`/api/produtos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Produto removido com sucesso!', 'success');
        loadProducts(searchInput.value);
      } else {
        showToast(data.error || 'Erro ao remover produto.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de conexão ao deletar produto.', 'error');
    }
  };

  // ==================== NAVEGAÇÃO ENTRE ETAPAS DO MODAL ====================
  btnOpenAddModal.addEventListener('click', () => {
    resetWizardForm();
    goToStep(1);
    addModal.classList.remove('hidden');
  });

  btnCloseAddModal.addEventListener('click', () => {
    addModal.classList.add('hidden');
  });

  function goToStep(step) {
    currentStep = step;
    step1Content.classList.add('hidden');
    step2Content.classList.add('hidden');
    step3Content.classList.add('hidden');

    dotStep1.classList.remove('active');
    dotStep2.classList.remove('active');
    dotStep3.classList.remove('active');
    lineStep1.classList.remove('active');
    lineStep2.classList.remove('active');

    if (step === 1) {
      modalStepTitle.innerHTML = '<i class="fa-solid fa-camera"></i> Passo 1: Foto do Produto';
      step1Content.classList.remove('hidden');
      dotStep1.classList.add('active');
    } else if (step === 2) {
      modalStepTitle.innerHTML = '<i class="fa-solid fa-microphone"></i> Passo 2: Áudio & IA';
      step2Content.classList.remove('hidden');
      dotStep1.classList.add('active');
      lineStep1.classList.add('active');
      dotStep2.classList.add('active');
    } else if (step === 3) {
      modalStepTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Passo 3: Confirmação';
      step3Content.classList.remove('hidden');
      dotStep1.classList.add('active');
      lineStep1.classList.add('active');
      dotStep2.classList.add('active');
      lineStep2.classList.add('active');
      dotStep3.classList.add('active');
    }
  }

  // Eventos de troca de passo
  btnSkipStep1.addEventListener('click', () => goToStep(2));
  btnNextStep1.addEventListener('click', () => goToStep(2));

  btnBackStep2.addEventListener('click', () => goToStep(1));
  btnSkipStep2.addEventListener('click', () => goToStep(3));
  btnNextStep2.addEventListener('click', () => goToStep(3));

  btnBackStep3.addEventListener('click', () => goToStep(2));

  // ==================== TRATAMENTO DE IMAGEM (PASSO 1) ====================
  function handleImageSelected(e) {
    const file = e.target.files[0];
    if (file) {
      selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = (event) => {
        imagePreview.src = event.target.result;
        imagePreviewContainer.classList.remove('hidden');
        imageUploadButtons.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  }

  cameraInput.addEventListener('change', handleImageSelected);
  galleryInput.addEventListener('change', handleImageSelected);

  btnRemoveImage.addEventListener('click', () => {
    selectedImageFile = null;
    cameraInput.value = '';
    galleryInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    imageUploadButtons.classList.remove('hidden');
  });

  // ==================== MICROFONE GLOBAL (FAB) ====================
  const btnGlobalMic = document.getElementById('btnGlobalMic');
  const globalMicIcon = document.getElementById('globalMicIcon');

  function initGlobalMicRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    globalRecognition = new SpeechRecognition();
    globalRecognition.lang = 'pt-BR';
    globalRecognition.continuous = false;      // Para automaticamente após 1 frase
    globalRecognition.interimResults = false;  // Só resultado final

    globalRecognition.onstart = () => {
      isGlobalMicRecording = true;
      btnGlobalMic.classList.add('recording');
      globalMicIcon.className = 'fa-solid fa-stop';
      showToast('Ouvindo... Fale o produto agora!', 'info');
    };

    globalRecognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      showToast('Analisando com IA...', 'info');
      // Processa com IA e abre modal já preenchido
      await processGlobalTranscript(transcript);
    };

    globalRecognition.onerror = (event) => {
      console.warn('Erro no mic global:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        showToast('Permissão de microfone negada. Verifique as configurações do navegador.', 'warning');
      } else {
        showToast('Não foi possível capturar. Tente novamente.', 'warning');
      }
      stopGlobalMic();
    };

    globalRecognition.onend = () => {
      // Garante que o mic é SEMPRE desativado ao terminar — mesmo automaticamente
      stopGlobalMic();
    };
  }

  function stopGlobalMic() {
    isGlobalMicRecording = false;
    btnGlobalMic.classList.remove('recording');
    globalMicIcon.className = 'fa-solid fa-microphone';
  }

  btnGlobalMic.addEventListener('click', () => {
    if (!globalRecognition) {
      // Sem API de voz: abre modal normal
      showToast('Voz não disponível neste navegador. Use o botão + para cadastrar.', 'info');
      return;
    }
    if (isGlobalMicRecording) {
      globalRecognition.stop(); // Para manualmente se já estiver gravando
      stopGlobalMic();
    } else {
      try {
        globalRecognition.start();
      } catch (err) {
        console.error('Erro ao iniciar mic global:', err);
        showToast('Toque novamente para tentar ativar o microfone.', 'warning');
      }
    }
  });

  async function processGlobalTranscript(text) {
    try {
      const res = await authFetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();

      if (data.success && data.data) {
        const d = data.data;
        // Limpa o estado anterior do formulário
        resetWizardForm();
        // Preenche os campos extraídos com a IA
        inputCodigo.value = d.codigo || '';
        inputProduto.value = d.produto || '';
        inputQuantidade.value = d.quantidade || 1;
        inputCor.value = d.cor || '';
        transcriptText.value = text;
        // Abre o modal diretamente no Passo 3 (Confirmação)
        goToStep(3);
        addModal.classList.remove('hidden');
        showToast('Dados preenchidos pela IA! Confirme e salve.', 'success');
      } else {
        showToast('Não foi possível identificar o produto. Tente falar novamente.', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar voz com IA.', 'error');
    }
  }

  // ==================== VOZ E RECONHECIMENTO (PASSO 2) ====================
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        isRecording = true;
        btnRecordAudio.classList.add('recording');
        recordStatusText.textContent = 'Ouvindo... Fale agora!';
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        transcriptText.value = transcript;
        showToast('Áudio capturado! Analisando com IA...', 'info');
        processTranscriptWithAI(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Erro na transcrição de voz:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showToast('Navegadores móbiles exigem HTTPS ou microfone do teclado. Toque no teclado do celular para ditar!', 'warning');
        } else {
          showToast('Não foi possível capturar o áudio. Você pode ditar pelo microfone do teclado ou digitar.', 'warning');
        }
        stopAudioRecording();
      };

      recognition.onend = () => {
        stopAudioRecording();
      };
    } else {
      console.log('Web Speech API não suportada neste navegador.');
    }
  }

  function stopAudioRecording() {
    isRecording = false;
    btnRecordAudio.classList.remove('recording');
    recordStatusText.textContent = 'Toque para Gravar Áudio';
  }

  btnRecordAudio.addEventListener('click', () => {
    if (!recognition) {
      showToast('Dica: Use o botão de microfone no teclado do seu celular para ditar!', 'info');
      transcriptText.focus();
      return;
    }

    if (isRecording) {
      recognition.stop();
      stopAudioRecording();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
        showToast('Use o microfone do teclado do celular no campo abaixo.', 'info');
        transcriptText.focus();
      }
    }
  });

  btnAnalyzeAI.addEventListener('click', () => {
    const text = transcriptText.value.trim();
    if (!text) {
      showToast('Digite ou grave um texto primeiro.', 'warning');
      return;
    }
    processTranscriptWithAI(text);
  });

  async function processTranscriptWithAI(text) {
    btnAnalyzeAI.disabled = true;
    btnAnalyzeAI.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando IA...';

    try {
      const res = await authFetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();

      if (data.success && data.data) {
        const extracted = data.data;
        if (extracted.codigo) inputCodigo.value = extracted.codigo;
        if (extracted.produto) inputProduto.value = extracted.produto;
        if (extracted.quantidade) inputQuantidade.value = extracted.quantidade;
        if (extracted.cor) inputCor.value = extracted.cor;

        showToast('Dados extraídos com sucesso pela IA!', 'success');
        // Avançar para o passo 3 automaticamente para o usuário confirmar
        setTimeout(() => goToStep(3), 600);
      } else {
        showToast(data.error || 'Erro ao processar texto com IA.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de comunicação com o servidor de IA.', 'error');
    } finally {
      btnAnalyzeAI.disabled = false;
      btnAnalyzeAI.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analisar com IA';
    }
  }

  // ==================== SALVAR PRODUTO (PASSO 3) ====================
  btnSaveProduct.addEventListener('click', async () => {
    const produto = inputProduto.value.trim();
    if (!produto) {
      showToast('O nome do produto é obrigatório.', 'warning');
      inputProduto.focus();
      return;
    }

    btnSaveProduct.disabled = true;
    btnSaveProduct.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const formData = new FormData();
    formData.append('codigo', inputCodigo.value.trim());
    formData.append('produto', produto);
    formData.append('quantidade', inputQuantidade.value || 1);
    formData.append('cor', inputCor.value.trim());

    if (selectedImageFile) {
      formData.append('imagemFile', selectedImageFile);
    }

    try {
      const url = editingProductId ? `/api/produtos/${editingProductId}` : '/api/produtos';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await authFetch(url, { method, body: formData });
      const data = await res.json();

      if (data.success) {
        showToast(editingProductId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!', 'success');
        addModal.classList.add('hidden');
        resetWizardForm();
        loadProducts();
      } else {
        showToast(data.error || 'Erro ao salvar produto.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro de rede ao salvar produto.', 'error');
    } finally {
      btnSaveProduct.disabled = false;
      btnSaveProduct.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Produto';
    }
  });

  function resetWizardForm() {
    editingProductId = null;
    selectedImageFile = null;
    cameraInput.value = '';
    galleryInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    imageUploadButtons.classList.remove('hidden');

    transcriptText.value = '';
    inputCodigo.value = '';
    inputProduto.value = '';
    inputQuantidade.value = 1;
    inputCor.value = '';

    goToStep(1);
  }

  // ==================== EXPORTAÇÃO & WEBSHARE API ====================
  btnOpenExportModal.addEventListener('click', () => {
    exportModal.classList.remove('hidden');
  });

  btnCloseExportModal.addEventListener('click', () => {
    exportModal.classList.add('hidden');
  });

  btnExportDB.addEventListener('click', () => handleExport('/api/export/db', 'estoque_database.sqlite', 'application/x-sqlite3'));
  btnExportExcel.addEventListener('click', () => handleExport('/api/export/excel', 'estoque_produtos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
  btnExportCSV.addEventListener('click', () => handleExport('/api/export/csv', 'estoque_produtos.csv', 'text/csv'));

  async function handleExport(endpoint, filename, mimeType) {
    showToast('Gerando arquivo para exportação...', 'info');

    try {
      const response = await authFetch(endpoint);
      if (!response.ok) throw new Error('Falha ao gerar arquivo de exportação.');

      const blob = await response.blob();
      const file = new File([blob], filename, { type: mimeType });

      // Verificar suporte à Web Share API (Celular)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Estoque Mobile - Exportação',
            text: `Segue em anexo o arquivo de estoque (${filename}).`
          });
          showToast('Arquivo compartilhado com sucesso!', 'success');
          exportModal.classList.add('hidden');
          return;
        } catch (shareErr) {
          // Se o usuário simplesmente cancelou o menu nativo de compartilhamento
          if (shareErr.name === 'AbortError') return;
          console.warn('Web Share falhou, caindo para download direto:', shareErr);
        }
      }

      // Download direto via Blob URL (Desktop ou Fallback)
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showToast('Download do arquivo iniciado!', 'success');
      exportModal.classList.add('hidden');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar/compartilhar o estoque.', 'error');
    }
  }

  // ==================== AUXILIARES ====================
  function showToast(msg, type = 'success') {
    toastMessage.textContent = msg;

    if (type === 'error') {
      toastIcon.className = 'fa-solid fa-circle-exclamation';
      toast.style.borderColor = '#ef4444';
    } else if (type === 'warning') {
      toastIcon.className = 'fa-solid fa-triangle-exclamation';
      toast.style.borderColor = '#f59e0b';
    } else if (type === 'info') {
      toastIcon.className = 'fa-solid fa-circle-info';
      toast.style.borderColor = '#3b82f6';
    } else {
      toastIcon.className = 'fa-solid fa-circle-check';
      toast.style.borderColor = '#10b981';
    }

    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
