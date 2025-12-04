import * as THREE from 'three';

export const samplePointsFromText = (text: string, count: number, size: number = 100): Float32Array => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new Float32Array(count * 3);

  const width = 200;
  const height = 200;
  canvas.width = width;
  canvas.height = height;

  // Draw text
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size}px "Arial", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  const validPixels: number[] = [];
  
  // Find all white pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      // Check red channel for brightness
      if (data[index] > 128) {
        validPixels.push(x, y);
      }
    }
  }

  const positions = new Float32Array(count * 3);

  if (validPixels.length === 0) return positions;

  for (let i = 0; i < count; i++) {
    // Randomly select a valid pixel
    const pixelIndex = Math.floor(Math.random() * (validPixels.length / 2)) * 2;
    const px = validPixels[pixelIndex];
    const py = validPixels[pixelIndex + 1];

    // Normalize to centered 3D coords
    // Invert Y because canvas Y is down
    const x = (px - width / 2) * 0.15; 
    const y = -(py - height / 2) * 0.15;
    const z = (Math.random() - 0.5) * 2; // Add some depth to the text

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
};

// Generates a random sphere cloud
export const generateSphereCloud = (count: number, radius: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};
