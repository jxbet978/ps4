/**
 * LOADING OVERLAY MANAGER
 * Sistema centralizado para gestionar la pantalla de carga
 * Compatible con todas las páginas del sitio
 */

class LoadingOverlayManager {
    constructor() {
        this.overlay = null;
        this.isInitialized = false;
        this.defaultMessages = {
            loading: 'Cargando',
            verifying: 'Cargando',
            sending: 'Cargando',
            connecting: 'Cargando',
            success: 'Cargando',
            error: 'Cargando'
        };
    }

    /**
     * Inicializa el overlay usando el elemento existente en el HTML
     */
    init() {
        if (this.isInitialized) {
            console.log('LoadingOverlay ya está inicializado');
            return;
        }

        // Buscar el overlay existente en el HTML
        this.overlay = document.getElementById('loadingOverlay') || document.querySelector('.loading-overlay');
        
        // Si no existe en HTML, crearlo dinámicamente
        if (!this.overlay) {
            console.log('📦 Creando overlay dinámicamente');
            this.overlay = document.createElement('div');
            this.overlay.className = 'loading-overlay';
            this.overlay.id = 'loadingOverlay';
            this.overlay.setAttribute('role', 'alert');
            this.overlay.setAttribute('aria-live', 'assertive');
            this.overlay.setAttribute('aria-busy', 'true');
            
            this.overlay.innerHTML = `
                <div class="loading-content">
                    <img src="Imagenes/channels4_profile-removebg-preview.png" 
                         alt="Banco de Bogotá" 
                         class="loading-logo"
                         onerror="this.style.display='none'">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                    </div>
                    <p class="loading-text">Cargando</p>
                    <p class="loading-subtext"></p>
                </div>
            `;

            // Agregar al body
            document.body.appendChild(this.overlay);
        } else {
            console.log('✅ Usando overlay existente del HTML');
        }
        
        this.isInitialized = true;
        console.log('✅ LoadingOverlay inicializado correctamente');
    }

    /**
     * Muestra el overlay con mensaje 'Cargando'
     * @param {string} message - No usado, siempre muestra 'Cargando'
     * @param {string} subtext - No usado
     */
    show(message = null, subtext = null) {
        if (!this.isInitialized) {
            this.init();
        }

        const textElement = this.overlay.querySelector('.loading-text');
        const subtextElement = this.overlay.querySelector('.loading-subtext');

        if (textElement) {
            textElement.textContent = 'Cargando';
        }

        if (subtextElement) {
            subtextElement.textContent = '';
        }

        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            this.overlay.classList.add('active');
        });

        console.log('📺 Overlay visible: Cargando');
    }

    /**
     * Oculta el overlay
     * @param {number} delay - Retraso antes de ocultar (ms)
     */
    hide(delay = 0) {
        if (!this.isInitialized || !this.overlay) {
            console.warn('LoadingOverlay no está inicializado');
            return;
        }

        setTimeout(() => {
            this.overlay.classList.remove('active');
            
            // Restaurar scroll después de la animación
            setTimeout(() => {
                document.body.style.overflow = '';
            }, 300);

            console.log('📺 LoadingOverlay ocultado');
        }, delay);
    }

    /**
     * Actualiza el mensaje (siempre 'Cargando')
     * @param {string} message - No usado
     * @param {string} subtext - No usado
     */
    updateMessage(message, subtext = null) {
        if (!this.isInitialized) return;

        const textElement = this.overlay.querySelector('.loading-text');
        const subtextElement = this.overlay.querySelector('.loading-subtext');

        if (textElement) {
            textElement.textContent = 'Cargando';
        }

        if (subtextElement) {
            subtextElement.textContent = '';
        }
    }

    /**
     * Muestra overlay de carga genérico
     */
    showLoading(message = null) {
        this.show();
    }

    /**
     * Muestra overlay de verificación
     */
    showVerifying(message = null) {
        this.show();
    }

    /**
     * Muestra overlay de envío
     */
    showSending(message = null) {
        this.show();
    }

    /**
     * Muestra overlay de conexión
     */
    showConnecting(message = null) {
        this.show();
    }

    /**
     * Muestra mensaje de éxito y luego oculta
     * @param {string} message - No usado
     * @param {number} duration - Duración en ms
     */
    showSuccess(message = null, duration = 1500) {
        this.show();
        setTimeout(() => this.hide(), duration);
    }

    /**
     * Muestra mensaje de error y luego oculta
     * @param {string} message - No usado
     * @param {number} duration - Duración en ms
     */
    showError(message = null, duration = 2500) {
        this.show();
        setTimeout(() => this.hide(), duration);
    }

    /**
     * Verifica si el overlay está visible
     * @returns {boolean}
     */
    isVisible() {
        return this.overlay && this.overlay.classList.contains('active');
    }

    /**
     * Destruye el overlay y limpia recursos
     */
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.isInitialized = false;
        document.body.style.overflow = '';
        console.log('🗑️ LoadingOverlay destruido');
    }
}

// Crear instancia global
window.loadingOverlay = new LoadingOverlayManager();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.loadingOverlay.init();
    });
} else {
    window.loadingOverlay.init();
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingOverlayManager;
}
