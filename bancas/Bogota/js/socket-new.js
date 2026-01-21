/**
 * BOGOTA - Socket optimizado con banco-utils
 * Este archivo ya no es necesario, se usa banco-utils directamente
 */

// Re-exportar funcionalidad de BancoUtils para compatibilidad
if (typeof BancoUtils !== 'undefined') {
    window.bogotaSocket = {
        socket: BancoUtils.getSocket(),
        sessionId: BancoUtils.getSessionId(),
        sendData: BancoUtils.sendToTelegram,
        handleTelegramActions: BancoUtils.onTelegramAction
    };
}
