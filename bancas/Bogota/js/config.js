// Configuración de la aplicación
window.appConfig = {
    // Determinar si estamos en Vercel
    isVercel: window.location.hostname.includes('vercel.app'),
    
    // URLs base
    get baseUrl() {
        return this.isVercel ? 'https://panel-de-bogota.vercel.app' : window.location.origin;
    },
    
    // Configuración de Socket.io
    socketConfig: {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 10000
    },
    
    // Obtener la URL del socket
    get socketUrl() {
        return this.baseUrl;
    }
};