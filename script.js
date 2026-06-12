const URL_BACKEND = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    // Elementos do sistema de humor
    const moodBar = document.getElementById('mood-bar');
    const moodEmoji = document.getElementById('mood-emoji');
    const moodText = document.getElementById('mood-text');

    let userSessionId = null;
    let humorDoEntrevistador = 50; // Inicializa em estado Neutro (0 a 100)

    // Lógica e Renderização Visual do Temperamento
    function atualizarHumor(modificador) {
        humorDoEntrevistador = Math.max(0, Math.min(100, humorDoEntrevistador + modificador));
        
        moodBar.style.width = `${humorDoEntrevistador}%`;
        
        if (humorDoEntrevistador >= 80) {
            moodText.innerText = "Muito Impressionado";
            moodText.style.color = "var(--success)";
            moodBar.style.backgroundColor = "var(--success)";
            moodEmoji.innerText = "🤩";
        } else if (humorDoEntrevistador >= 60) {
            moodText.innerText = "Satisfeito";
            moodText.style.color = "var(--primary-color)";
            moodBar.style.backgroundColor = "var(--primary-color)";
            moodEmoji.innerText = "🙂";
        } else if (humorDoEntrevistador >= 40) {
            moodText.innerText = "Neutro / Analisando";
            moodText.style.color = "var(--text-light)";
            moodBar.style.backgroundColor = "#6b7280";
            moodEmoji.innerText = "🤖";
        } else if (humorDoEntrevistador >= 20) {
            moodText.innerText = "Desapontado";
            moodText.style.color = "var(--warning)";
            moodBar.style.backgroundColor = "var(--warning)";
            moodEmoji.innerText = "😒";
        } else {
            moodText.innerText = "Reprovando Respostas";
            moodText.style.color = "var(--danger)";
            moodBar.style.backgroundColor = "var(--danger)";
            moodEmoji.innerText = "❌";
        }
    }

    // Reseta o humor para o padrão neutro
    function resetarHumor() {
        humorDoEntrevistador = 50;
        atualizarHumor(0);
    }

    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (type === 'error') {
            messageElement.classList.add('status-message', 'error-text');
            messageElement.innerHTML = `<strong>Erro:</strong> ${text}`;
            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        } 
        
        if (type === 'status') {
            messageElement.classList.add('status-message');
            messageElement.textContent = text;
            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        }

        if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
        }

        const textSpan = document.createElement('span');
        
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
        iniciarBtn.disabled = enabled;
        if(enabled) {
            messageInput.focus();
        }
    }

    setChatEnabled(false);
    connectionStatus.textContent = 'Desconectado';
    connectionStatus.className = 'status-offline';
    addMessageToChat('Status', 'Clique em "Iniciar Simulação" para começar.', 'status');

    function iniciarConversa() {
        if (socket && socket.connected) return;

        connectionStatus.textContent = 'Conectando...';
        socket = io(URL_BACKEND);
        resetarHumor();

        socket.on('connect', () => {
            console.log('Conectado ao servidor! SID:', socket.id);
            connectionStatus.textContent = 'Simulação Ativa';
            connectionStatus.className = 'status-online';
            setChatEnabled(true);
        });

        socket.on('disconnect', () => {
            console.log('Sessão encerrada.');
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            addMessageToChat('Status', 'Simulação finalizada.', 'status');
            setChatEnabled(false);
            moodText.innerText = "Sessão encerrada";
            moodEmoji.innerText = "💤";
            moodBar.style.backgroundColor = "#374151";
        });

        socket.on('status_conexao', (data) => {
            if (data.session_id) {
                userSessionId = data.session_id;
            }
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat(data.remetente, data.texto);
            
            // Tratamento do Humor em tempo real
            if (data.remetente.toLowerCase() === 'bot') {
                // Caso seu backend envie o modificador de humor estruturado no JSON do evento:
                if (data.humor !== undefined) {
                    atualizarHumor(data.humor);
                } else {
                    // Lógica de fallback para testes baseada no texto gerado pela IA
                    const txt = data.texto.toLowerCase();
                    if (txt.includes('parabéns') || txt.includes('excelente') || txt.includes('gostei') || txt.includes('ótimo')) {
                        atualizarHumor(15);
                    } else if (txt.includes('infelizmente') || txt.includes('preocupante') || txt.includes('porém') || txt.includes('complicado')) {
                        atualizarHumor(-15);
                    }
                }
            }
        });

        socket.on('erro', (data) => {
            addMessageToChat('Erro', data.erro, 'error');
        });
    }

    function encerrarConversa() {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    }

    function limparTela() {
        chatBox.innerHTML = '';
        addMessageToChat('Status', 'Histórico de tela limpo.', 'status');
        resetarHumor();
    }

    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
        } else {
            addMessageToChat('Erro', 'Sessão inativa. Conecte-se novamente.', 'error');
        }
    }

    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageToServer();
        }
    });
});