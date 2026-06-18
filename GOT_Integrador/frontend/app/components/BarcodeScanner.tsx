// src/app/components/BarcodeScanner.tsx
import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const quaggaRef = useRef<any>(null);

  // ── CARGAR QUAGGA ──
  useEffect(() => {
    // Verificar si Quagga ya está cargado
    if ((window as any).Quagga) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setError('Error al cargar el lector de códigos');
    };
    document.head.appendChild(script);

    return () => {
      stopScanner();
    };
  }, []);

  // ── INICIAR ESCÁNER ──
  useEffect(() => {
    if (scriptLoaded) {
      startScanner();
    }
  }, [scriptLoaded]);

  const startScanner = () => {
    if (scanning) return;

    const Quagga = (window as any).Quagga;
    if (!Quagga) {
      setError('Quagga no disponible');
      return;
    }

    if (!containerRef.current) {
      setError('Contenedor no disponible');
      return;
    }

    // Limpiar contenedor antes de iniciar
    containerRef.current.innerHTML = '';

    setError(null);

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: containerRef.current,
        constraints: {
          facingMode: "environment",
          width: { min: 480, ideal: 640, max: 1280 },
          height: { min: 320, ideal: 480, max: 720 }
        }
      },
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_93_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader",
          "codabar_reader"
        ]
      },
      locate: true,
      frequency: 10
    }, function(err: any) {
      if (err) {
        console.error('Error al iniciar Quagga:', err);
        setError('Error al iniciar la cámara: ' + (err.message || 'desconocido'));
        return;
      }
      
      Quagga.start();
      setScanning(true);
      console.log('📷 Escáner iniciado correctamente');
    });

    // ── CUANDO SE DETECTA UN CÓDIGO ──
    Quagga.onDetected(function(data: any) {
      const code = data.codeResult.code;
      console.log('📦 Código detectado:', code);
      
      if (code === lastCode) return;
      setLastCode(code);
      
      // Detener el escáner después de leer el código
      stopScanner();
      onScan(code);
    });

    // ── CUANDO NO SE DETECTA NADA ──
    Quagga.onProcessed(function(result: any) {
      // Solo para debug, opcional
    });

    quaggaRef.current = Quagga;
  };

  const stopScanner = () => {
    if (quaggaRef.current) {
      try {
        quaggaRef.current.stop();
        quaggaRef.current.offDetected();
        quaggaRef.current.offProcessed();
      } catch (e) {
        console.warn('Error al detener Quagga:', e);
      }
    }
    setScanning(false);
    quaggaRef.current = null;
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    startScanner();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Escanear código de barras</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Container */}
        <div className="relative aspect-[4/3] bg-black/90 overflow-hidden">
          <div 
            ref={containerRef} 
            id="scanner-container" 
            className="w-full h-full"
          />
          
          {/* Overlay con líneas de escaneo */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Línea de escaneo animada */}
            <div className="absolute left-[10%] right-[10%] top-[35%] h-[1px] bg-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-scanLine"></div>
            
            {/* Marco de enfoque */}
            <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border-2 border-green-400/30 rounded-lg"></div>
            
            {/* Esquinas */}
            <div className="absolute top-[22%] left-[22%] w-6 h-6 border-t-2 border-l-2 border-green-400"></div>
            <div className="absolute top-[22%] right-[22%] w-6 h-6 border-t-2 border-r-2 border-green-400"></div>
            <div className="absolute bottom-[22%] left-[22%] w-6 h-6 border-b-2 border-l-2 border-green-400"></div>
            <div className="absolute bottom-[22%] right-[22%] w-6 h-6 border-b-2 border-r-2 border-green-400"></div>
          </div>

          {/* Indicador de carga mientras no hay cámara */}
          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="p-4 border-t border-border bg-background/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                scanning ? 'bg-green-400 animate-pulse' : 
                error ? 'bg-red-400' : 
                scriptLoaded ? 'bg-yellow-400' : 'bg-gray-600'
              }`}></div>
              <span className="text-sm text-muted-foreground">
                {scanning ? '🔍 Escaneando...' : 
                 error ? '❌ ' + error : 
                 scriptLoaded ? '⏳ Iniciando cámara...' : 
                 '📦 Cargando lector...'}
              </span>
            </div>
            {scanning && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>

          {/* Botón de reintentar si hay error */}
          {error && (
            <div className="mt-3">
              <button 
                onClick={handleRetry}
                className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition text-sm font-medium"
              >
                🔄 Reintentar
              </button>
            </div>
          )}

          {/* Instrucciones */}
          {!error && (
            <div className="mt-2 text-xs text-muted-foreground/70 flex items-center gap-2">
              <span>📷</span>
              <span>Acercá el código de barras a la cámara</span>
            </div>
          )}
        </div>
      </div>

      {/* Animación CSS para la línea de escaneo */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 25%; }
          50% { top: 65%; }
        }
        .animate-scanLine {
          animation: scanLine 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}