document.addEventListener('DOMContentLoaded', function() {
    
    // Elementos de la interfaz
    const recordButton = document.getElementById('recordButton');
    const recordingsContainer = document.getElementById('recordingsContainer');
    const statusDisplay = document.getElementById('statusDisplay');
    const timerDisplay = document.getElementById('timer');
    
    // Variables para la grabación
    let mediaRecorder;
    let audioStream;
    let isRecording = false;
    let recordings = [];
    let currentRecordingIndex = 0;
    let recordingStartTime = 0;
    let timerInterval;
    let segmentInterval;
    
    // Duración de cada segmento y traslape
    const SEGMENT_DURATION = 15000; // 15 segundos
    const OVERLAP = 5000; // 5 segundos
    const SEGMENT_START_INTERVAL = SEGMENT_DURATION - OVERLAP; // 10 segundos
    
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
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Configurar grabación
            mediaRecorder = new MediaRecorder(audioStream);
            recordings = [];
            currentRecordingIndex = 0;
            recordingStartTime = Date.now();
            
            // Cambiar estado de interfaz
            isRecording = true;
            recordButton.textContent = "Detener Grabación";
            recordButton.classList.add('stop');
            statusDisplay.textContent = "Grabando...";
            
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
        
        // Crear un nuevo MediaRecorder para este segmento
        const segmentRecorder = new MediaRecorder(audioStream);
        const audioChunks = [];
        
        segmentRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        segmentRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const startSec = Math.floor(segmentStartTime / 1000);
            const endSec = Math.floor((segmentStartTime + SEGMENT_DURATION) / 1000);
            
            // Crear elemento de audio para reproducción
            const audioUrl = URL.createObjectURL(audioBlob);
            const audioElement = document.createElement('audio');
            audioElement.src = audioUrl;
            audioElement.controls = true;
            
            // Agregar a la lista de grabaciones
            const recordingItem = document.createElement('div');
            recordingItem.className = 'recording-item';
            
            const downloadLink = document.createElement('a');
            downloadLink.href = audioUrl;
            downloadLink.download = `grabacion-${startSec}-${endSec}.wav`;
            downloadLink.textContent = `Descargar: ${startSec}s - ${endSec}s`;
            
            recordingItem.appendChild(document.createTextNode(`Grabación ${segmentIndex + 1} (${startSec}s - ${endSec}s): `));
            recordingItem.appendChild(audioElement);
            recordingItem.appendChild(document.createElement('br'));
            recordingItem.appendChild(downloadLink);
            
            recordingsContainer.appendChild(recordingItem);
        };
        
        // Iniciar grabación de este segmento
        segmentRecorder.start();
        
        // Detener después de la duración del segmento
        setTimeout(() => {
            if (segmentRecorder.state === 'recording') {
                segmentRecorder.stop();
            }
        }, SEGMENT_DURATION);
        
        // Guardar referencia
        recordings.push(segmentRecorder);
    }
    
    // Detener toda la grabación
    function stopRecording() {
        // Detener intervalo de segmentos
        clearInterval(segmentInterval);
        
        // Detener temporizador
        clearInterval(timerInterval);
        
        // Detener todos los grabadores activos
        recordings.forEach(recorder => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        });
        
        // Detener y liberar stream de audio
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
        }
        
        // Actualizar interfaz
        isRecording = false;
        recordButton.textContent = "Iniciar Grabación";
        recordButton.classList.remove('stop');
        statusDisplay.textContent = "Grabación detenida";
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