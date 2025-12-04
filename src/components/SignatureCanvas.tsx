import React, { useRef, useState, useEffect } from 'react';
import { Button, Space } from 'antd';
import { ClearOutlined, UndoOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface SignatureCanvasProps {
  value?: string;
  onChange?: (value: string) => void;
  width?: number;
  height?: number;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  value,
  onChange,
  width = 500,
  height = 200,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if provided
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    }
  }, [width, height, value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Save to history
    const dataUrl = canvas.toDataURL('image/png');
    const newHistory = history.slice(0, currentStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setCurrentStep(newHistory.length - 1);

    // Notify parent of change
    if (onChange) {
      onChange(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clear history
    setHistory([]);
    setCurrentStep(-1);

    if (onChange) {
      onChange('');
    }
  };

  const undo = () => {
    if (currentStep <= 0) {
      clear();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Load previous state
    if (prevStep >= 0) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[prevStep];

      if (onChange) {
        onChange(history[prevStep]);
      }
    } else {
      if (onChange) {
        onChange('');
      }
    }
  };

  return (
    <div>
      <div
        style={{
          border: '2px dashed #D1D5DB',
          borderRadius: 8,
          padding: 8,
          display: 'inline-block',
          backgroundColor: '#FAFBFC',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            cursor: 'crosshair',
            backgroundColor: '#FFFFFF',
            borderRadius: 4,
            display: 'block',
          }}
        />
      </div>
      <Space style={{ marginTop: 12 }}>
        <Button
          icon={<UndoOutlined />}
          onClick={undo}
          disabled={currentStep < 0}
          style={{ borderRadius: 6 }}
        >
          {t('common.undo') || 'Undo'}
        </Button>
        <Button
          icon={<ClearOutlined />}
          onClick={clear}
          danger
          style={{ borderRadius: 6 }}
        >
          {t('common.clear') || 'Clear'}
        </Button>
      </Space>
    </div>
  );
};

export default SignatureCanvas;
