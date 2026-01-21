document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando dashboard...');
    
    // Inicializar funciones comunes
    commonUtils.initializeCommon();

    // Elementos de la interfaz
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'welcome-message';
    welcomeMessage.innerHTML = `
        <h1>Bienvenido al Panel de Control</h1>
        <p>Por favor espere mientras procesamos su información...</p>
    `;
    document.querySelector('.dashboard-container').appendChild(welcomeMessage);

    // Elementos del dashboard
    const dashboardContent = document.createElement('div');
    dashboardContent.className = 'dashboard-content';
    dashboardContent.innerHTML = `
        <div class="dashboard-header">
            <h2>Estado de su Solicitud</h2>
            <div class="status-indicator processing">
                <span class="status-dot"></span>
                <span class="status-text">Procesando...</span>
            </div>
        </div>
        <div class="dashboard-body">
            <div class="info-card">
                <div class="card-header">
                    <i class="fas fa-shield-alt"></i>
                    <h3>Verificación de Seguridad</h3>
                </div>
                <div class="card-body">
                    <ul class="verification-steps">
                        <li class="step complete">
                            <span class="step-number">1</span>
                            <span class="step-text">Información recibida</span>
                            <i class="fas fa-check"></i>
                        </li>
                        <li class="step active">
                            <span class="step-number">2</span>
                            <span class="step-text">Verificación en proceso</span>
                            <div class="step-loader"></div>
                        </li>
                        <li class="step">
                            <span class="step-number">3</span>
                            <span class="step-text">Confirmación final</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="info-card">
                <div class="card-header">
                    <i class="fas fa-clock"></i>
                    <h3>Tiempo Estimado</h3>
                </div>
                <div class="card-body">
                    <div class="time-estimate">
                        <div class="timer">
                            <span class="minutes">02</span>:<span class="seconds">00</span>
                        </div>
                        <p>Tiempo restante aproximado</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="dashboard-footer">
            <div class="support-info">
                <i class="fas fa-info-circle"></i>
                <p>Si necesita ayuda, por favor espere a que un asesor se comunique con usted.</p>
            </div>
        </div>
    `;
    document.querySelector('.dashboard-container').appendChild(dashboardContent);

    // Estilos adicionales
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .dashboard-container {
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
        }
        .welcome-message {
            text-align: center;
            margin-bottom: 2rem;
        }
        .welcome-message h1 {
            color: #1a73e8;
            margin-bottom: 0.5rem;
        }
        .dashboard-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .dashboard-header {
            background: #f8f9fa;
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            background: #e8f5e9;
        }
        .status-indicator.processing {
            background: #e3f2fd;
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #1a73e8;
            animation: pulse 2s infinite;
        }
        .info-card {
            background: white;
            border-radius: 8px;
            margin: 1rem;
            border: 1px solid #e9ecef;
        }
        .card-header {
            padding: 1rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .card-body {
            padding: 1.5rem;
        }
        .verification-steps {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .step {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 0;
            opacity: 0.5;
        }
        .step.active {
            opacity: 1;
        }
        .step.complete {
            opacity: 1;
            color: #4caf50;
        }
        .step-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        .step.complete .step-number {
            background: #4caf50;
            color: white;
        }
        .step-loader {
            width: 20px;
            height: 20px;
            border: 2px solid #e3f2fd;
            border-top: 2px solid #1a73e8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        .time-estimate {
            text-align: center;
        }
        .timer {
            font-size: 2.5rem;
            font-weight: bold;
            color: #1a73e8;
            margin-bottom: 0.5rem;
        }
        .support-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            margin-top: 1rem;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleSheet);

    // Iniciar temporizador
    let minutes = 2;
    let seconds = 0;
    const timerInterval = setInterval(() => {
        if (seconds === 0) {
            if (minutes === 0) {
                clearInterval(timerInterval);
                return;
            }
            minutes--;
            seconds = 59;
        } else {
            seconds--;
        }
        
        document.querySelector('.minutes').textContent = String(minutes).padStart(2, '0');
        document.querySelector('.seconds').textContent = String(seconds).padStart(2, '0');
    }, 1000);
});