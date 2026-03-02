varying vec2 vUv;

void main() {
  vUv = uv;
  // Standard full-screen projection mapping assuming a flat plane.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}