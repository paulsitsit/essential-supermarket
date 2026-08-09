import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Zap } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const readerId = 'essential-scanner-reader';

export default function CameraScanner({ onDetected }) {
  const scannerRef = useRef(null);
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const onDetectedRef = useRef(onDetected);

  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    mountedRef.current = true;

    async function loadCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();

        if (!mountedRef.current) {
          return;
        }

        if (!devices.length) {
          setError(
            'Camera unavailable. Connect a camera or use manual barcode search.'
          );
          return;
        }

        setCameras(devices);

        const rearCamera = devices.find(device =>
          /back|rear|environment/i.test(device.label)
        );

        setCameraId((rearCamera || devices[0]).id);
      } catch {
        if (mountedRef.current) {
          setError(
            'Camera permission was denied or no camera is available.'
          );
        }
      }
    }

    loadCameras();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!cameraId) {
      return undefined;
    }

    startScanner(cameraId);

    return () => {
      stopScanner();
    };
  }, [cameraId]);

  async function startScanner(deviceId) {
    const generation = generationRef.current + 1;
    generationRef.current = generation;

    await stopScanner(false);

    if (
      !mountedRef.current ||
      generation !== generationRef.current
    ) {
      return;
    }

    setError('');
    setRunning(false);
    setFlashSupported(false);
    setFlashOn(false);

    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        deviceId,
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 150
          },
          aspectRatio: 1.4
        },
        async decodedText => {
          if (generation !== generationRef.current) {
            return;
          }

          console.log('Decoded scanner value:', decodedText);

          await stopScanner();

          if (mountedRef.current) {
            await onDetectedRef.current(decodedText);
          }
        },
        () => {}
      );

      if (
        !mountedRef.current ||
        generation !== generationRef.current
      ) {
        await clearScanner(scanner);
        return;
      }

      setRunning(true);

      try {
        setFlashSupported(
          scanner.isTorchFeatureSupported()
        );
      } catch {
        setFlashSupported(false);
      }
    } catch (err) {
      if (
        !mountedRef.current ||
        generation !== generationRef.current
      ) {
        return;
      }

      setRunning(false);

      const message = String(
        err?.message || ''
      ).toLowerCase();

      if (message.includes('permission')) {
        setError(
          'Camera permission was denied. Allow camera access and try again.'
        );
      } else if (message.includes('notfound')) {
        setError('No camera was found on this device.');
      } else {
        setError(
          'Unable to start the camera. Use manual barcode search instead.'
        );
      }

      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }

      await clearScanner(scanner);
    }
  }

  async function clearScanner(scanner) {
    try {
      if (scanner?.isScanning) {
        await scanner.stop();
      }
    } catch {}

    try {
      await scanner?.clear();
    } catch {}
  }

  async function stopScanner(invalidate = true) {
    if (invalidate) {
      generationRef.current += 1;
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      setRunning(false);
      setFlashOn(false);
      return;
    }

    await clearScanner(scanner);

    setRunning(false);
    setFlashOn(false);
  }

  async function toggleFlash() {
    const scanner = scannerRef.current;

    if (!scanner || !flashSupported) {
      return;
    }

    try {
      await scanner.applyVideoConstraints({
        advanced: [
          {
            torch: !flashOn
          }
        ]
      });

      setFlashOn(value => !value);
    } catch {
      setError(
        'The flashlight could not be controlled on this device.'
      );
    }
  }

  function handleScanAgain() {
    if (cameraId) {
      startScanner(cameraId);
    }
  }

  return (
    <div className="scanner-box">
      <div
        id={readerId}
        className="scanner-reader"
      />

      {error && (
        <div className="scanner-error">
          {error}
        </div>
      )}

      <div className="scanner-controls">
        {cameras.length > 1 && (
          <label className="camera-select">
            <Camera size={16} />

            <select
              value={cameraId}
              onChange={event =>
                setCameraId(event.target.value)
              }
            >
              {cameras.map((camera, index) => (
                <option
                  value={camera.id}
                  key={camera.id}
                >
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}

        {running && flashSupported && (
          <button
            type="button"
            className={
              flashOn
                ? 'scanner-control active-control'
                : 'scanner-control'
            }
            onClick={toggleFlash}
          >
            <Zap size={16} />
            {flashOn ? 'Flash on' : 'Flash'}
          </button>
        )}

        <button
          type="button"
          className="scanner-control"
          onClick={handleScanAgain}
        >
          <RotateCcw size={16} />
          Scan again
        </button>
      </div>
    </div>
  );
}