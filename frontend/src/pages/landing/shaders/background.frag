uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
varying vec2 vUv;

// Simplex 3D noise (optimization over classic perlin)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

void main() {
    vec2 st = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 stFixed = st;
    stFixed.x *= aspect;

    // Smooth breathing animation (slow sine wave)
    float breathing = sin(uTime * 0.4) * 0.5 + 0.5;
    float t = uTime * 0.15 + breathing * 0.05;

    // Mouse movement slightly warps the surface
    // Interactive parallax and warping
    vec2 mouseOffset = uMouse * 0.05; 
    stFixed += mouseOffset;

    // Domain Warping using Simplex Noise (Fluid, organic effect)
    vec2 q = vec2(0.0);
    q.x = snoise(vec3(stFixed * 1.2, t));
    q.y = snoise(vec3(stFixed * 1.2 + vec2(5.2, 1.3), t));

    vec2 r = vec2(0.0);
    r.x = snoise(vec3(stFixed * 1.8 + q * 1.5, t * 1.2));
    r.y = snoise(vec3(stFixed * 1.8 + q * 1.5 + vec2(8.3, 2.8), t * 1.2));

    // Final distortion field
    float f = snoise(vec3(stFixed * 1.0 + r * 2.0, t * 0.8));

    // Colors: Dark base (#0B0F1A), Deep Blue, Violet
    vec3 colorBase = vec3(0.043, 0.059, 0.102); 
    
    // Deep blue: #111e40
    vec3 colorBlue = vec3(0.06, 0.12, 0.25);
    
    // Violet/Purple softly blending
    vec3 colorViolet = vec3(0.18, 0.08, 0.35);
    
    // Vibrant highlight glow
    vec3 colorHighlight = vec3(0.40, 0.15, 0.65);

    // Mix the base with the deep blue based on the primary flow
    vec3 color = mix(colorBase, colorBlue, clamp(f * 1.5 + 0.5, 0.0, 1.0));
    
    // Add violet in the secondary ripples
    color = mix(color, colorViolet, clamp(r.x * r.y * 2.5 + 0.2, 0.0, 1.0));

    // Soft glow transitions (radial falloff moving with noise)
    vec2 center = vec2(0.5) + mouseOffset * 0.5;
    float dist = length(vUv - center);
    float glow = exp(-dist * 2.2) * (snoise(vec3(vUv * 3.0, t * 2.0)) * 0.5 + 0.5);
    color += colorHighlight * glow * 0.7;

    // Vignette for depth
    float vignette = smoothstep(1.3, 0.2, dist);
    color *= mix(0.3, 1.0, vignette);

    // Subtle premium film grain
    float grain = fract(sin(dot(vUv.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    color += grain * 0.015;

    gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}