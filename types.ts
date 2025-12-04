export enum GestureType {
  NONE = 0,
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4
}

export interface HandState {
  gesture: GestureType;
  openness: number; // 0 (closed) to 1 (open)
  position: { x: number; y: number };
}

export interface ParticleData {
  initialPosition: [number, number, number];
  targetPosition: [number, number, number];
  currentPosition: [number, number, number];
}
