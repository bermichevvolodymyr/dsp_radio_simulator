import React, { useEffect, useRef } from "react";
interface VisualizerProps {
  analyser: AnalyserNode;
  isPlaying: boolean;
}
const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const samples = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const styles = getComputedStyle(document.documentElement);
      context.clearRect(0, 0, width, height);
      context.fillStyle = styles.getPropertyValue("--surface-sunken");
      context.fillRect(0, 0, width, height);
      context.strokeStyle = styles.getPropertyValue("--border");
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      for (let i = 1; i < 5; i++) {
        const x = (width / 5) * i;
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      context.stroke();
      if (!isPlaying) return;
      analyser.getByteTimeDomainData(samples);
      context.strokeStyle = styles.getPropertyValue("--accent");
      context.lineWidth = 1.5;
      context.beginPath();
      samples.forEach((sample, index) => {
        const x = (index / (samples.length - 1)) * width;
        const y = (sample / 255) * height;
        index ? context.lineTo(x, y) : context.moveTo(x, y);
      });
      context.stroke();
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [analyser, isPlaying]);
  return <canvas ref={canvasRef} className="visualizer" />;
};
export default Visualizer;
