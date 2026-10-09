import { Annot, Fade, Kicker, Reveal } from './ui'

const CLOUD = '/images/Cosmic%20Cloud.png'
const SPARKLE = '/images/sparkle%20galaxy.png'
const EARTH = '/images/earth.png'

const MEMBERS = [
  {
    n: '01',
    lines: ['Anika Binta', 'Azad Shifa'],
    role: 'Project Lead, UI/UX Design & Frontend Engineering',
    annot: 'ui/ux · frontend',
    motif: 'cloud',
  },
  {
    n: '02',
    lines: ['Sejuti', 'Humyra'],
    role: 'Backend & ML Engineer',
    annot: 'backend · ml',
    motif: 'sparkle',
  },
  {
    n: '03',
    lines: ['Samiha Tasnim', 'Mim'],
    role: 'Data Scientist & Sonification Specialist',
    annot: 'data · sonification',
    motif: 'earth',
  },
  {
    n: '04',
    lines: ['Tousif', 'Tasrik'],
    role: 'System Architect & AI Engineer',
    annot: 'architecture · ai',
    motif: 'cloud-mirror',
  },
  {
    n: '05',
    lines: ['Abu Saleh', 'Md Nahian'],
    role: 'Visual Experience & Motion Design Engineer',
    annot: 'motion · visual',
    motif: 'sparkle-duo',
  },
]

function Header({ n, role }) {
  return (
    <Fade>
      <div className="flex items-baseline justify-between gap-6">
        <span className="font-stencil uppercase text-[10.5px] md:text-[12px] tracking-[0.38em] text-ivory">
          {n} <span className="mx-1 text-ember">/</span> TEAM
        </span>
        <span className="truncate font-data text-[9px] md:text-[10.5px] uppercase tracking-[0.22em] text-parchment/80 md:max-w-[46%] md:whitespace-normal md:text-right">
          {role}
        </span>
      </div>
      <div className="mt-3 h-px w-full bg-ivory/15" />
    </Fade>
  )
}

function Name({ lines, align = 'left', italicLast = false }) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'md:text-right' : ''
  return (
    <h3
      className={`mt-10 font-display font-light uppercase leading-[0.95] text-ivory text-[clamp(2.6rem,9vw,7.5rem)] md:mt-14 ${alignClass}`}
    >
      {lines.map((line, i) => (
        <Reveal key={line} delay={0.08 * i}>
          <span
            className={`block ${italicLast && i === lines.length - 1 ? 'italic text-cream' : ''}`}
          >
            {line}
          </span>
        </Reveal>
      ))}
    </h3>
  )
}

/* 01 — cloud mark drifting behind the name, left-aligned text */
function LayoutCloud({ m }) {
  return (
    <div className="relative">
      <Fade delay={0.25} y={34} className="pointer-events-none absolute top-[30%] right-[-14%] z-0 w-[min(52vw,480px)] md:right-[-4%]">
        <img src={CLOUD} alt="" className="w-full -rotate-7 opacity-70 select-none" draggable="false" />
      </Fade>
      <div className="relative z-10">
        <Header n={m.n} role={m.role} />
        <Name lines={m.lines} />
        <Fade delay={0.3}>
          <Annot className="mt-8">{m.annot}</Annot>
        </Fade>
      </div>
    </div>
  )
}

/* 02 — outlined numeral ghost, right-aligned text, sparkle low */
function LayoutSparkle({ m }) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[6%] left-[-3%] font-display leading-none text-[42vw] md:text-[22rem] lg:text-[26rem] text-transparent select-none [-webkit-text-stroke:1px_rgba(242,237,227,0.16)]"
      >
        {m.n}
      </span>
      <Fade delay={0.25} y={34} className="pointer-events-none absolute bottom-[4%] left-[-6%] z-0 w-[min(40vw,300px)] md:left-[2%]">
        <img src={SPARKLE} alt="" className="w-full rotate-10 opacity-60 select-none" draggable="false" />
      </Fade>
      <div className="relative z-10">
        <Header n={m.n} role={m.role} />
        <Name lines={m.lines} align="right" />
        <Fade delay={0.3}>
          <Annot className="mt-8 md:text-right">{m.annot}</Annot>
        </Fade>
      </div>
    </div>
  )
}

/* 03 — centred column, the earth arc rises like a horizon below */
function LayoutEarth({ m }) {
  return (
    <div className="relative text-center">
      <Fade delay={0.25} y={34} className="pointer-events-none absolute inset-x-0 bottom-[-18%] z-0 flex justify-center">
        <img src={EARTH} alt="" className="w-[min(110vw,1000px)] opacity-55 select-none" draggable="false" />
      </Fade>
      <div className="relative z-10">
        <Header n={m.n} role={m.role} />
        <Name lines={m.lines} align="center" italicLast />
        <Fade delay={0.3}>
          <Annot className="mt-8 text-center">{m.annot}</Annot>
        </Fade>
      </div>
    </div>
  )
}

/* 04 — solid ghost numeral left, mirrored cloud right */
function LayoutMirror({ m }) {
  return (
    <div className="relative grid items-center gap-10 lg:grid-cols-12">
      <Fade className="pointer-events-none relative z-0 lg:col-span-5">
        <span
          aria-hidden="true"
          className="font-display leading-none text-[38vw] md:text-[18rem] lg:text-[22rem] text-ivory/10 select-none"
        >
          {m.n}
        </span>
      </Fade>
      <Fade delay={0.25} y={34} className="pointer-events-none absolute top-[2%] right-[-12%] z-0 w-[min(46vw,400px)] md:right-[0%]">
        <img src={CLOUD} alt="" className="w-full -scale-x-100 rotate-5 opacity-55 select-none" draggable="false" />
      </Fade>
      <div className="relative z-10 lg:col-span-7">
        <Header n={m.n} role={m.role} />
        <Name lines={m.lines} />
        <Fade delay={0.3}>
          <Annot className="mt-8">{m.annot}</Annot>
        </Fade>
      </div>
    </div>
  )
}

/* 05 — full-width sign-off, sparkle pair at opposing rotations */
function LayoutDuo({ m }) {
  return (
    <div className="relative">
      <Fade delay={0.25} y={34} className="pointer-events-none absolute top-[0%] right-[0%] z-0 w-[min(26vw,190px)]">
        <img src={SPARKLE} alt="" className="w-full rotate-12 opacity-70 select-none" draggable="false" />
      </Fade>
      <Fade delay={0.4} y={34} className="pointer-events-none absolute bottom-[2%] left-[0%] z-0 w-[min(20vw,140px)]">
        <img src={SPARKLE} alt="" className="w-full -rotate-6 opacity-50 select-none" draggable="false" />
      </Fade>
      <div className="relative z-10">
        <Header n={m.n} role={m.role} />
        <Name lines={m.lines} italicLast />
        <Fade delay={0.3}>
          <Annot className="mt-8">{m.annot}</Annot>
        </Fade>
      </div>
    </div>
  )
}

const LAYOUTS = {
  cloud: LayoutCloud,
  sparkle: LayoutSparkle,
  earth: LayoutEarth,
  'cloud-mirror': LayoutMirror,
  'sparkle-duo': LayoutDuo,
}

export default function TeamMembers() {
  return (
    <>
      {MEMBERS.map((m) => {
        const Layout = LAYOUTS[m.motif]
        return (
          <section
            key={m.n}
            aria-label={`${m.lines.join(' ')} — ${m.role}`}
            className="stack-card z-40 overflow-hidden px-6 pt-14 pb-28 md:px-12 md:pt-18 md:pb-36 lg:px-20 lg:pt-20 lg:pb-40"
          >
            <Layout m={m} />
          </section>
        )
      })}

      {/* closing line — a quiet full stop before the credits footer */}
      <section
        aria-label="Closing"
        className="stack-card z-40 flex min-h-[75vh] flex-col items-center justify-center px-6 py-36 text-center md:px-12"
      >
        <Fade>
          <Kicker center>COSMIC CLOUD</Kicker>
        </Fade>
        <Fade delay={0.15}>
          <p className="mt-8 font-display font-light leading-[1.1] text-ivory text-[clamp(1.8rem,4.4vw,3.6rem)]">
            Different perspectives.
            <span className="block italic text-cream">One shared universe.</span>
          </p>
        </Fade>
        <Fade delay={0.3}>
          <div className="mx-auto mt-10 h-px w-16 bg-ivory/25" />
          <Annot className="mt-6 text-center">nasa space apps challenge 2026</Annot>
        </Fade>
      </section>
    </>
  )
}
