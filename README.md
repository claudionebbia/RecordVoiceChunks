# Record Voice Chunks

Grabamos chunks de audio para facilitar y abaratar el uso de APIs de Voice2Text. La idea es usar el procesamiento de archivos de audio en lugar del de Streaming, que es bastante más caro. 
Los chunks se traslapan para evitar el tener palabras perdidas (cortadas a la mitad) y para poder ir procesando el audio con un delay tolerable.
Se separa el audio en canal izquierdo y derecho para poder tener un microfono para cada interlocutor (2) y así facilitar el tener dos dialogos separados, (colocando microfonos con aislamiento para cada uno, o para facilitar el filtrado).

El proyecto no requiere instalación, funciona directamente en el navegador con Vanilla JS. 
