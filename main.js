document.addEventListener('DOMContentLoaded', function() {
    // Elementos de la interfaz
    const recordButton = document.getElementById('recordButton');
    const recordingsContainer = document.getElementById('recordingsContainer');
    const statusDisplay = document.getElementById('statusDisplay');
    const timerDisplay = document.getElementById('timer');
    
    // Elementos del modal de configuración
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.getElementById('closeModal');
    const resetSettings = document.getElementById('resetSettings');
    const segmentDurationInput = document.getElementById('segmentDuration');
    const overlapDurationInput = document.getElementById('overlapDuration');
    const settingsSavedMsg = document.getElementById('settingsSaved');
    
    // Valores por defecto
    const DEFAULT_SEGMENT_DURATION = 15; // segundos
    const DEFAULT_OVERLAP = 5; // segundos
    
    // Variables para la grabación
    let audioContext;
    let mediaStream;
    let audioStreamSource;
    let splitter;
    let isRecording = false;
    let recordings = [];
    let currentRecordingIndex = 0;
    let recordingStartTime = 0;
    let timerInterval;
    let segmentInterval;
    
    // Configuración inicial (cargar desde localStorage o usar valores predeterminados)
    let SEGMENT_DURATION = parseInt(localStorage.getItem('gAudio_segmentDuration')) || DEFAULT_SEGMENT_DURATION * 1000;
    let OVERLAP = parseInt(localStorage.getItem('gAudio_overlapDuration')) || DEFAULT_OVERLAP * 1000;
    let SEGMENT_START_INTERVAL = SEGMENT_DURATION - OVERLAP;
    
    // Inicializar los campos de entrada con valores del localStorage
    segmentDurationInput.value = SEGMENT_DURATION / 1000;
    overlapDurationInput.value = OVERLAP / 1000;
    
    // Mostrar la configuración actual en el mensaje de estado
    updateStatusMessage();

    // Eventos para los cambios en los campos de entrada
    segmentDurationInput.addEventListener('change', saveSettings);
    overlapDurationInput.addEventListener('change', saveSettings);
    
    // Eventos para el modal de configuración
    settingsButton.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeModalFunction);
    resetSettings.addEventListener('click', resetSettingsFunction);
    
    // Función para actualizar el mensaje de estado
    function updateStatusMessage() {
        const segmentSec = SEGMENT_DURATION / 1000;
        const overlapSec = OVERLAP / 1000;
        
        if (!isRecording) {
            statusDisplay.textContent = `Listo para grabar (${segmentSec}s con traslape de ${overlapSec}s)`;
        } else {
            statusDisplay.textContent = `Grabando en estéreo... (${segmentSec}s con traslape de ${overlapSec}s)`;
        }
    }
    
    // Función para mostrar temporalmente el mensaje de guardado
    function showSavedMessage() {
        settingsSavedMsg.classList.add('visible');
        setTimeout(() => {
            settingsSavedMsg.classList.remove('visible');
        }, 1500);
    }
    
    // Función para abrir el modal
    function openModal() {
        settingsModal.style.display = 'block';
        // Mostrar los valores actuales
        segmentDurationInput.value = SEGMENT_DURATION / 1000;
        overlapDurationInput.value = OVERLAP / 1000;
    }
    
    // Función para cerrar el modal
    function closeModalFunction() {
        settingsModal.style.display = 'none';
    }
    
    // Función para guardar la configuración (llamada en onChange)
    function saveSettings() {
        const segmentValue = parseInt(segmentDurationInput.value);
        const overlapValue = parseInt(overlapDurationInput.value);
        
        // Validación básica
        if (isNaN(segmentValue) || segmentValue <= 0) {
            alert('La duración del segmento debe ser un número positivo');
            segmentDurationInput.value = SEGMENT_DURATION / 1000;
            return;
        }
        
        if (isNaN(overlapValue) || overlapValue < 0) {
            alert('El tiempo de traslape debe ser un número positivo o cero');
            overlapDurationInput.value = OVERLAP / 1000;
            return;
        }
        
        if (overlapValue >= segmentValue) {
            alert('El tiempo de traslape debe ser menor que la duración del segmento');
            overlapDurationInput.value = Math.max(0, Math.floor(segmentValue / 2));
            return;
        }
        
        // Guardar la configuración en variables locales
        SEGMENT_DURATION = segmentValue * 1000;
        OVERLAP = overlapValue * 1000;
        SEGMENT_START_INTERVAL = SEGMENT_DURATION - OVERLAP;
        
        // Guardar en localStorage
        localStorage.setItem('gAudio_segmentDuration', SEGMENT_DURATION);
        localStorage.setItem('gAudio_overlapDuration', OVERLAP);
        
        // Actualizar mensaje de estado
        updateStatusMessage();
        
        // Mostrar mensaje de guardado
        showSavedMessage();
    }
    
    // Función para resetear a valores por defecto
    function resetSettingsFunction() {
        // Restaurar valores por defecto
        SEGMENT_DURATION = DEFAULT_SEGMENT_DURATION * 1000;
        OVERLAP = DEFAULT_OVERLAP * 1000;
        SEGMENT_START_INTERVAL = SEGMENT_DURATION - OVERLAP;
        
        // Actualizar campos de entrada
        segmentDurationInput.value = DEFAULT_SEGMENT_DURATION;
        overlapDurationInput.value = DEFAULT_OVERLAP;
        
        // Guardar en localStorage
        localStorage.setItem('gAudio_segmentDuration', SEGMENT_DURATION);
        localStorage.setItem('gAudio_overlapDuration', OVERLAP);
        
        // Actualizar mensaje de estado
        updateStatusMessage();
        
        // Mostrar mensaje de guardado
        showSavedMessage();
    }
    
    // Si se hace clic fuera del modal, cerrarlo
    window.onclick = function(event) {
        if (event.target === settingsModal) {
            closeModalFunction();
        }
    };
    
    // Manejar clic en botón de grabación
    recordButton.addEventListener('click', toggleRecording);
    
    // Iniciar o detener grabación
    async function toggleRecording() {
        if (!isRecording) {
            await startRecording();
        } else {
            stopRecording();
        }
    }
    
    // Función para iniciar la grabación
    async function startRecording() {
        try {
            // Solicitar permisos de micrófono
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 2,  // Asegurarse de que grabamos en estéreo
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            // Configurar contexto de audio
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioStreamSource = audioContext.createMediaStreamSource(mediaStream);
            
            // Dividir canales
            splitter = audioContext.createChannelSplitter(2);
            audioStreamSource.connect(splitter);
            
            // Reiniciar variables
            recordings = [];
            currentRecordingIndex = 0;
            recordingStartTime = Date.now();
            
            // Cambiar estado de interfaz
            isRecording = true;
            recordButton.textContent = "Detener Grabación";
            recordButton.classList.add('stop');
            
            // Deshabilitar el botón de configuración durante la grabación
            settingsButton.disabled = true;
            
            // Actualizar mensaje de estado con la configuración actual
            updateStatusMessage();
            
            // Iniciar temporizador
            startTimer();
            
            // Iniciar primer segmento
            startRecordingSegment();
            
            // Configurar intervalo para iniciar nuevos segmentos
            segmentInterval = setInterval(() => {
                startRecordingSegment();
            }, SEGMENT_START_INTERVAL);
            
        } catch (error) {
            console.error("Error al iniciar la grabación:", error);
            statusDisplay.textContent = "Error al acceder al micrófono";
        }
    }
    
    // Iniciar un segmento de grabación
    function startRecordingSegment() {
        const segmentIndex = currentRecordingIndex++;
        const segmentStartTime = Date.now() - recordingStartTime;
        
        // Crear streams separados para cada canal
        const leftDestination = audioContext.createMediaStreamDestination();
        const rightDestination = audioContext.createMediaStreamDestination();
        
        // Conectar cada canal a su destino
        splitter.connect(leftDestination, 0); // Canal izquierdo
        splitter.connect(rightDestination, 1); // Canal derecho
        
        // Crear MediaRecorders para cada canal
        const leftRecorder = new MediaRecorder(leftDestination.stream);
        const rightRecorder = new MediaRecorder(rightDestination.stream);
        
        const leftChunks = [];
        const rightChunks = [];
        
        // Eventos para el canal izquierdo
        leftRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                leftChunks.push(event.data);
            }
        };
        
        // Eventos para el canal derecho
        rightRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                rightChunks.push(event.data);
            }
        };
        
        // Cuando ambos canales terminen de grabar
        let channelsCompleted = 0;
        const onChannelStop = () => {
            channelsCompleted++;
            
            // Cuando ambos canales han terminado
            if (channelsCompleted === 2) {
                const leftBlob = new Blob(leftChunks, { type: 'audio/wav' });
                const rightBlob = new Blob(rightChunks, { type: 'audio/wav' });
                
                const startSec = Math.floor(segmentStartTime / 1000);
                const endSec = Math.floor((segmentStartTime + SEGMENT_DURATION) / 1000);
                
                // Crear la UI para esta grabación
                createRecordingItem(segmentIndex, startSec, endSec, leftBlob, rightBlob);
            }
        };
        
        leftRecorder.onstop = onChannelStop;
        rightRecorder.onstop = onChannelStop;
        
        // Iniciar grabación en ambos canales
        leftRecorder.start();
        rightRecorder.start();
        
        // Detener después de la duración del segmento
        setTimeout(() => {
            if (leftRecorder.state === 'recording') {
                leftRecorder.stop();
            }
            if (rightRecorder.state === 'recording') {
                rightRecorder.stop();
            }
        }, SEGMENT_DURATION);
        
        // Guardar referencias
        recordings.push({
            left: leftRecorder,
            right: rightRecorder
        });
    }
    
    // Crear un elemento de interfaz para un segmento grabado
    function createRecordingItem(index, startSec, endSec, leftBlob, rightBlob) {
        // Crear URLs para los blobs
        const leftAudioUrl = URL.createObjectURL(leftBlob);
        const rightAudioUrl = URL.createObjectURL(rightBlob);
        
        // Crear elemento contenedor
        const recordingItem = document.createElement('div');
        recordingItem.className = 'recording-item';
        
        // Agregar título del segmento
        const titleElement = document.createElement('h3');
        titleElement.textContent = `Grabación ${index + 1} (${startSec}s - ${endSec}s)`;
        recordingItem.appendChild(titleElement);
        
        // Contenedor para los canales
        const channelsContainer = document.createElement('div');
        channelsContainer.className = 'channel-recordings';
        
        // Canal izquierdo
        const leftChannel = document.createElement('div');
        leftChannel.className = 'channel-container';
        leftChannel.innerHTML = `
            <h3>Canal Izquierdo</h3>
            <audio controls src="${leftAudioUrl}"></audio>
            <br>
            <a href="${leftAudioUrl}" download="canal-izquierdo-${startSec}-${endSec}.wav">
                Descargar Canal Izquierdo
            </a>
        `;
        
        // Canal derecho
        const rightChannel = document.createElement('div');
        rightChannel.className = 'channel-container';
        rightChannel.innerHTML = `
            <h3>Canal Derecho</h3>
            <audio controls src="${rightAudioUrl}"></audio>
            <br>
            <a href="${rightAudioUrl}" download="canal-derecho-${startSec}-${endSec}.wav">
                Descargar Canal Derecho
            </a>
        `;
        
        // Agregar canales al contenedor
        channelsContainer.appendChild(leftChannel);
        channelsContainer.appendChild(rightChannel);
        recordingItem.appendChild(channelsContainer);
        
        // Agregar al contenedor principal
        recordingsContainer.appendChild(recordingItem);
    }
    
    // Detener toda la grabación
    function stopRecording() {
        // Detener intervalo de segmentos
        clearInterval(segmentInterval);
        
        // Detener temporizador
        clearInterval(timerInterval);
        
        // Detener todos los grabadores activos
        recordings.forEach(recorders => {
            if (recorders.left.state === 'recording') {
                recorders.left.stop();
            }
            if (recorders.right.state === 'recording') {
                recorders.right.stop();
            }
        });
        
        // Detener y liberar stream de audio
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        
        // Cerrar el contexto de audio
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }
        
        // Actualizar interfaz
        isRecording = false;
        recordButton.textContent = "Iniciar Grabación";
        recordButton.classList.remove('stop');
        statusDisplay.textContent = "Grabación detenida";
        
        // Habilitar el botón de configuración
        settingsButton.disabled = false;
        
        // Actualizar mensaje de estado con la configuración actual
        setTimeout(updateStatusMessage, 2000);
    }
    
    // Iniciar temporizador
    function startTimer() {
        let seconds = 0;
        timerDisplay.textContent = "00:00";
        
        timerInterval = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
});