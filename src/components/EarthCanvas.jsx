import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const atmoVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vP;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const atmoFragment = /* glsl */ `
  varying vec3 vN;
  varying vec3 vP;
  uniform float uTime;
  uniform vec3 uColor;
  void main() {
    vec3 V = normalize(-vP);
    float f = pow(1.0 - abs(dot(normalize(vN), V)), 3.2);
    float breath = 0.88 + 0.12 * sin(uTime * 0.35);
    gl_FragColor = vec4(uColor, f * 0.46 * breath);
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

/* Textures are loaded imperatively (no React suspense — resilient across
   React 19.x versions) and shared between every <EarthCanvas> instance. */
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
    texturePromise = Promise.all(TEXTURE_URLS.map((url) => loader.loadAsync(url)))
  }
  return texturePromise
}

function Earth({ variant = 'hero' }) {
  const group = useRef()
  const clouds = useRef()
  const gl = useThree((s) => s.gl)
  const [tex, setTex] = useState(null)
  const atmoUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#f3e5c8') },
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
        for (const t of [day, night, topo, water, cloudTex]) t.anisotropy = max
        setTex({ day, night, topo, water, cloudTex })
      })
      .catch((err) => console.error('[EarthCanvas] texture load failed', err))
    return () => {
      alive = false
    }
  }, [gl])

  useFrame((_, delta) => {
    const speed = REDUCED() ? 0.004 : 0.02
    if (group.current) group.current.rotation.y += delta * speed
    if (clouds.current) clouds.current.rotation.y += delta * speed * 1.3
    atmoUniforms.uTime.value += delta
  })

  if (!tex) return null

  return (
    <group
      ref={group}
      position={[0, variant === 'hero' ? -2.05 : -1.55, 0]}
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
        <meshLambertMaterial map={tex.cloudTex} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* thin atmospheric rim — restrained, warm */}
      <mesh scale={[1.045, 1.045, 1.045]}>
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
        dpr={[1, 1.75]}
        camera={{ fov: 42, position: [0, 0.55, 5.6], near: 0.1, far: 130 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
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
