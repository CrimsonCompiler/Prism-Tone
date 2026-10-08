import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const atmoVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mv.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vPosition = position;
    gl_Position = projectionMatrix * mv;
  }
`

const atmoFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform vec3 uSunDirection;

  // Fast hardware-friendly hash for smooth cloud noise
  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = rot * p * 2.05 + vec2(11.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 V = normalize(vViewPosition);
    vec3 N = normalize(vNormal);
    
    // t goes from 0 (center) to 1 (outer silhouette edge)
    float t = 1.0 - abs(dot(N, V));
    
    // Soft brush gradient: fade in gently from planet, and fade OUT to 0 BEFORE geometric boundary
    float innerGradient = smoothstep(0.12, 0.62, t);
    float outerDissolve = smoothstep(0.95, 0.58, t);
    float softAtmosphere = innerGradient * outerDissolve;
    
    // Early exit: skip expensive cloud noise when outside the atmospheric rim
    if (softAtmosphere <= 0.002) {
      gl_FragColor = vec4(0.0);
      return;
    }

    // Drifting cloud wisps flowing across upper atmosphere
    vec3 WN = normalize(vWorldNormal);
    float lon = atan(WN.z, WN.x);
    float lat = WN.y;
    vec2 uvWisp1 = vec2(lon * 2.2 + uTime * 0.016, lat * 3.8);
    vec2 uvWisp2 = vec2(lon * 4.0 - uTime * 0.024, lat * 5.5 + uTime * 0.008);
    
    float w1 = fbm(uvWisp1);
    float w2 = fbm(uvWisp2);
    float cloudNoise = smoothstep(0.32, 0.72, w1 * 0.65 + w2 * 0.35);
    
    // Sunlight modulation: brightest on sunlit side, soft natural falloff on dark side
    float sunDot = dot(WN, normalize(uSunDirection));
    float sunFactor = smoothstep(-0.30, 0.55, sunDot);
    
    // Natural painterly colors: deep atmospheric blue, sky cyan mist, and soft pearl cloud highlights
    vec3 deepSky = vec3(0.24, 0.54, 0.88);
    vec3 lightMist = vec3(0.52, 0.79, 0.96);
    vec3 cloudWhite = vec3(0.92, 0.95, 0.98);
    vec3 sunGlint = vec3(1.0, 0.96, 0.90);
    
    vec3 baseAtmo = mix(deepSky, lightMist, softAtmosphere);
    vec3 withClouds = mix(baseAtmo, cloudWhite, cloudNoise * 0.72);
    vec3 finalColor = mix(withClouds, sunGlint, clamp(sunDot * 0.28, 0.0, 0.35));
    
    // Soft density blending: brush-like gradient + floating cloud mist
    float density = softAtmosphere * (0.32 + 0.68 * cloudNoise);
    float alpha = density * (sunFactor * 0.65 + 0.035);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`

function Stars({ count = 420 }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 26 + Math.random() * 32
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      pos[i * 3 + 2] = r * Math.cos(ph)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count])

  return (
    <points geometry={geo}>
      <pointsMaterial
        size={0.05}
        sizeAttenuation
        color="#cfc6b4"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  )
}

/* Textures are loaded imperatively and shared between instances */
const TEXTURE_URLS = [
  '/textures/earth-day-graded.jpg',
  '/textures/earth-night-graded.jpg',
  '/textures/earth-topo.png',
  '/textures/earth-water.png',
  '/textures/earth-clouds-graded.png',
]

let texturePromise = null
function getTextures() {
  if (!texturePromise) {
    const loader = new THREE.TextureLoader()
    texturePromise = Promise.all(
      TEXTURE_URLS.map((url) =>
        loader.loadAsync(url).then((tex) => {
          tex.generateMipmaps = true
          return tex
        })
      )
    )
  }
  return texturePromise
}

// Preload textures immediately in browser
if (typeof window !== 'undefined') {
  getTextures()
}

function Earth({ variant = 'hero' }) {
  const group = useRef()
  const clouds = useRef()
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const [tex, setTex] = useState(null)

  const { earthScale, earthY } = useMemo(() => {
    if (variant !== 'hero') {
      return { earthScale: 1, earthY: -1.55 }
    }
    // Baseline reference: 1920x940 desktop
    const hRatio = size.height / 940
    const wRatio = size.width / 1550
    // Proportional scale factor with smooth safe clamping
    const scale = Math.min(1.05, Math.max(0.58, Math.min(hRatio, wRatio)))
    // Keep Earth top crest at consistent screen height (~0.50 down from camera center)
    const topTarget = 0.50 - (1 - scale) * 0.12
    const y = topTarget - 2.55 * scale
    return { earthScale: scale, earthY: y }
  }, [variant, size.width, size.height])

  const atmoUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(-7, 2.5, 3.5).normalize() },
    }),
    [],
  )

  useEffect(() => {
    let alive = true
    getTextures()
      .then(([day, night, topo, water, cloudTex]) => {
        if (!alive) return
        day.colorSpace = THREE.SRGBColorSpace
        night.colorSpace = THREE.SRGBColorSpace
        const max = gl.capabilities.getMaxAnisotropy()
        const aniso = Math.min(max, 4)
        for (const t of [day, night, topo, water, cloudTex]) {
          t.anisotropy = aniso
          t.minFilter = THREE.LinearMipmapLinearFilter
          t.magFilter = THREE.LinearFilter
          t.generateMipmaps = true
        }
        setTex({ day, night, topo, water, cloudTex })
      })
      .catch((err) => console.error('[EarthCanvas] texture load failed', err))
    return () => {
      alive = false
    }
  }, [gl])

  useFrame((_, delta) => {
    // Clamp delta to maximum of 33ms (30fps equivalent) to prevent large rotational jumps on hitches
    const d = Math.min(delta, 0.033)
    const speed = REDUCED() ? 0.004 : 0.02
    if (group.current) group.current.rotation.y += d * speed
    if (clouds.current) clouds.current.rotation.y += d * speed * 1.3
    atmoUniforms.uTime.value += d
  })

  if (!tex) return null

  return (
    <group
      ref={group}
      position={[0, earthY, 0]}
      scale={[earthScale, earthScale, earthScale]}
      rotation={[0, 2.35, 0.09]}
    >
      <mesh>
        <sphereGeometry args={[2.55, 96, 96]} />
        <meshPhongMaterial
          map={tex.day}
          bumpMap={tex.topo}
          bumpScale={0.05}
          specularMap={tex.water}
          specular="#37322a"
          shininess={10}
          emissiveMap={tex.night}
          emissive="#e6dabf"
          emissiveIntensity={0.62}
        />
      </mesh>

      <mesh ref={clouds} scale={[1.009, 1.009, 1.009]}>
        <sphereGeometry args={[2.55, 64, 64]} />
        <meshLambertMaterial map={tex.cloudTex} transparent opacity={0.38} depthWrite={false} />
      </mesh>

      {/* ethereal drifting clouds & painterly atmospheric gradient — no strict border */}
      <mesh scale={[1.032, 1.032, 1.032]}>
        <sphereGeometry args={[2.55, 64, 64]} />
        <shaderMaterial
          vertexShader={atmoVertex}
          fragmentShader={atmoFragment}
          uniforms={atmoUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

function Scene({ variant }) {
  return (
    <>
      <ambientLight intensity={0.1} color="#f2ede3" />
      {/* single warm key light raking from the left — the planet stays mostly in darkness */}
      <directionalLight position={[-7, 2.5, 3.5]} intensity={2.2} color="#ffeed6" />
      <directionalLight position={[5, -1, -4]} intensity={0.14} color="#93a2ac" />
      <Stars />
      <Earth variant={variant} />
    </>
  )
}

export default function EarthCanvas({ variant = 'hero', className = '' }) {
  const wrapRef = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '220px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrapRef} className={`h-full w-full ${className}`}>
      <Canvas
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ fov: 42, position: [0, 0.55, 5.6], near: 0.1, far: 130 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.12
        }}
      >
        <Scene variant={variant} />
      </Canvas>
    </div>
  )
}
