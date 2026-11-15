import { ArrowRight, Check, Plus, X } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Drawer } from '../components/Drawer'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'
import { pretty } from '../panels/format'
import type { Site } from '../types/data'

type DetailId = 'mars' | 'moon' | 'check' | 'match' | 'audit'

/**
 * Calculations page ("/calculations"): how the sites were found and matched, in the order it was done.
 * The page itself stays light: one idea per section, a figure or a small diagram, no formulas.
 * Each section has a "Details" button that opens a drawer with the thresholds, formulas, data and tables.
 * Facts follow docs/SCREENING_RESULTS.md, docs/ANALOG_RESULTS.md and docs/AUDIT.md — keep them in sync;
 * per-site values are read from sites.json.
 */
export function CalculationsPage() {
  const [detail, setDetail] = useState<DetailId | null>(null)
  const data = useData()
  const sites = data.status === 'ready' ? data.sites.sites : []
  const candidates = (body: 'mars' | 'moon') => sites.filter((s) => s.body === body && s.selection.role === 'candidate')
  const nMars = candidates('mars').length || 5
  const nMoon = candidates('moon').length || 3
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  return (
    <main className="relative z-10 min-h-svh px-6 pt-28 pb-24 sm:px-10">
      {/* Veil over the 3D scene, the size of the screen (a blur as tall as the page is costly to paint). */}
      <div className="fixed inset-0 -z-10 bg-space/75 backdrop-blur-[6px]" aria-hidden="true" />
      <SiteHeader />
      <article className="mx-auto max-w-5xl">
        <header className="max-w-3xl">
          <p className="stagger eyebrow text-ink-muted" style={step(0)}>
            Calculations
          </p>
          <h1 className="stagger headline mt-4 text-5xl sm:text-6xl" style={step(1)}>
            How we found the sites, and their places on Earth
          </h1>
          <p className="stagger mt-6 text-lg leading-relaxed text-ink/90" style={step(2)}>
            Four steps, each built on open NASA, USGS and ESA data. The page gives the idea of each step; the Details buttons
            hold the thresholds, formulas and tables.
          </p>
        </header>

        <ol className="stagger mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4" style={step(3)}>
          <FlowStep n={1} href="#screen" title="Screen" text="Test every part of Mars and the lunar south pole against safety rules." />
          <FlowStep n={2} href="#check" title="Check" text="Run the same rules on places where spacecraft really landed." />
          <FlowStep n={3} href="#match" title="Match" text="Rank all land on Earth against each site; keep three places." />
          <FlowStep n={4} href="#audit" title="Audit" text="Compare every number with an independent reference." />
        </ol>

        {/* What sets the project apart */}
        <section className="stagger mt-16 grid gap-5 md:grid-cols-2" style={step(4)}>
          <div className="rounded-2xl border border-line p-6">
            <p className="eyebrow text-ink-muted">The usual way</p>
            <h2 className="mt-3 font-display text-2xl leading-tight font-semibold text-ink/80">Start from a site someone already chose</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Take a place where a spacecraft landed, or a region an agency has announced, and look for ground on Earth that
              resembles it.
            </p>
          </div>
          <div className="rounded-2xl border border-earth/50 bg-earth/[0.06] p-6">
            <p className="eyebrow text-earth">What we did</p>
            <h2 className="mt-3 font-display text-2xl leading-tight font-semibold">Start from the maps and choose the sites ourselves</h2>
            <p className="mt-3 leading-relaxed text-ink/90">
              We applied published mission limits to the whole of Mars and to the Moon&apos;s south pole, and kept what passed:{' '}
              {nMars} landing zones and {nMoon} base sites that are ours. Known sites became the test of our rules, not the starting point.
            </p>
          </div>
        </section>

        {/* Step 1 — Mars */}
        <Section id="screen" n="Step 1 · Mars" accent="var(--color-mars)" title="Five rules for a safe landing" onDetails={() => setDetail('mars')}>
          <p className="max-w-3xl leading-relaxed text-ink/90">
            Each rule stands for something a lander needs. A place counts only if all five hold across a 25 km square, the size
            of a modern landing ellipse.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <RuleCard title="Air to brake in" limit="Elevation ≤ −1 km" basis="Curiosity">
              Parachutes need air, and low ground has more of it above.
            </RuleCard>
            <RuleCard title="Winter sunlight" limit="Latitude within ±30°" basis="Curiosity, Perseverance">
              Near the equator the Sun stays high all year, for power and warmth.
            </RuleCard>
            <RuleCard title="Firm ground" limit="Thermal inertia ≥ 100, and not bright where it is below 150" basis="Curiosity, Perseverance">
              Deep dust is too soft to drive on. Ground that holds heat is firmer; bright ground that does not is dust.
            </RuleCard>
            <RuleCard title="Gentle slopes" limit="≤ 3° over 2–5 km" basis="Curiosity">
              A tilted plain misleads the landing radar as powered descent begins.
            </RuleCard>
            <RuleCard title="Low relief" limit="≤ 500 m over 18 km" basis="Ours" ours>
              No crater walls or mountains inside the landing area.
            </RuleCard>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-[1fr_1.2fr]">
            <Figure value="4.5 %" label="of Mars passes all five rules: 6.45 million km² in 895 separate patches">
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[4.5%] rounded-full bg-accent" />
              </div>
            </Figure>
            <div className="rounded-2xl border border-line p-5">
              <p className="eyebrow text-ink-muted">From safe ground to {nMars} zones</p>
              <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-ink/85">
                <Tick>Take the point deepest inside safe ground, in a safe area of at least 40,000 km²</Tick>
                <Tick>It must be more than 500 km from every place a lander has come down, so it is new</Tick>
                <Tick>Take the next deepest point that is also 1,500 km from the zones already chosen</Tick>
                <Tick>Stop when the best point left is less than 40 km inside its area. That happened after five.</Tick>
              </ul>
            </div>
          </div>
        </Section>

        {/* Step 1 — Moon */}
        <Section id="moon" n="Step 1 · Moon" accent="var(--color-moon)" title="Four rules for a permanent base" onDetails={() => setDetail('moon')}>
          <p className="max-w-3xl leading-relaxed text-ink/90">
            A base stays for years, so it needs power, a radio link, level ground and water. We searched the south pole beyond
            84° S, where the Sun skims the horizon and high ground can stay lit while crater floors stay dark.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RuleCard title="Sunlight for power" limit="Lit ≥ 50 % of the time" basis="Ours" ours>
              Measured at the surface. Published 85–95 % figures are for masts 2–10 m tall.
            </RuleCard>
            <RuleCard title="Earth in view" limit="Visible ≥ 50 % of the time" basis="Ours" ours>
              A direct radio link without relay satellites.
            </RuleCard>
            <RuleCard title="Level ground" limit="Slope ≤ 10°" basis="Ours" ours>
              Room to land, build and drive.
            </RuleCard>
            <RuleCard title="Ice within reach" limit="≤ 10 km to a shadowed area of ≥ 1 km²" basis="Ours" ours>
              Crater floors that never see the Sun can keep water ice. Specks of shadow do not count.
            </RuleCard>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <Figure value="3" label="ridges pass every rule and every quality gate. A fourth would have meant lowering the bar, so we stopped at three." />
            <Figure value="2" label="lie 16 km and 38 km from the named feature of NASA's de Gerlache Rim 2 region, which our screening never used." />
            <Figure value="1" label="lies outside NASA's regions: the Cabeus–Malapert ridge, the best lit of the three, with Earth in view 92 % of the time." />
          </div>
        </Section>

        {/* Step 2 — the check */}
        <Section id="check" n="Step 2 · Check" accent="var(--color-ink)" title="The same rules on real missions" onDetails={() => setDetail('check')}>
          <p className="max-w-3xl leading-relaxed text-ink/90">
            If the rules are sound, they should accept the places where landings worked, and each rejection should have a
            reason. We ran them on all 11 past Mars landings, on the 7 named features of NASA&apos;s Artemis III regions and
            on the 3 robotic landers that have reached the Moon&apos;s south polar region. We also asked why each mission went
            where it did: a site that fails our rules was usually chosen for a different job.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-line p-5">
              <p className="eyebrow text-mars">Mars · 11 past landings</p>
              <ul className="mt-4 space-y-4">
                <Outcome pass names="Viking 1, Pathfinder, Spirit, Opportunity, InSight, Zhurong">
                  Pass all five rules.
                </Outcome>
                <Outcome names="Curiosity, Perseverance">
                  Fail only low relief. Both landed beside the mountain or delta they came to study, using guided landing systems built for that.
                </Outcome>
                <Outcome names="Viking 2, Phoenix, Mars 3">
                  Fail winter sunlight: high-latitude sites. Viking ran on nuclear power, and Phoenix went north to reach ice.
                </Outcome>
                <Outcome pass names="Their own missions' limits">
                  All 7 landings whose own published elevation and latitude limits we found pass them on our map.
                </Outcome>
              </ul>
            </div>
            <div className="rounded-2xl border border-line p-5">
              <p className="eyebrow text-moon">Moon · NASA&apos;s Artemis III regions</p>
              <ul className="mt-4 space-y-4">
                <Outcome pass names="Malapert Massif, Mons Mouton, de Gerlache Rim 2, Slater Plain">
                  Passing ground within 25 km of the named feature: 4 of 7.
                </Outcome>
                <Outcome names="Peak near Cabeus B, Haworth, Nobile Rim">
                  No passing ground within 25 km. NASA also weighs science goals and launch windows, which we do not model.
                </Outcome>
                <Outcome names="Chandrayaan-3, IM-1 Odysseus, IM-2 Athena">
                  Real landings, built for about one lunar day. None is lit half the year, so none passes as a base site. Our map gives 11° where IM-1 tipped over on a 12° slope.
                </Outcome>
              </ul>
            </div>
          </div>
        </Section>

        {/* Step 3 — matching */}
        <Section id="match" n="Step 3 · Match" accent="var(--color-earth)" title="Ranking all land on Earth" onDetails={() => setDetail('match')}>
          <p className="max-w-3xl leading-relaxed text-ink/90">
            Earth&apos;s land is cut into cells of about 25 km. Each cell gets a score from 0 to 100 on every dimension, and the
            weighted total decides the ranking for a site. The three best places that are bare, inland and at least 500 km
            apart become its training areas.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Weights
              world="For a Mars site"
              parts={[
                { label: 'Terrain', share: 30 },
                { label: 'Rock type', share: 20 },
                { label: 'Dryness', share: 20 },
                { label: 'Surface brightness', share: 10 },
                { label: 'Temperature', share: 10 },
                { label: 'Thin air', share: 10 },
              ]}
            />
            <Weights
              world="For a Moon site"
              parts={[
                { label: 'Terrain', share: 25 },
                { label: 'Rock type', share: 25 },
                { label: 'Low Sun', share: 20 },
                { label: 'Frozen ground', share: 15 },
                { label: 'Dryness', share: 10 },
                { label: 'Temperature', share: 5 },
              ]}
            />
          </div>
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Measure term="Terrain">How steep the ground is across 25 km, compared at the same map scale on both worlds.</Measure>
            <Measure term="Rock type">The rock of the unit mapped at the site against a global rock map of Earth.</Measure>
            <Measure term="Dryness">Rainfall averaged over 23 years and how bare the ground is, from satellites.</Measure>
            <Measure term="Temperature">Day-to-night swing of the surface temperature, and cold.</Measure>
            <Measure term="Surface brightness (Mars)">How dark the ground is from orbit: dark rock and gravel, not bright sand or salt.</Measure>
            <Measure term="Thin air (Mars)">Elevation. High ground has thinner air and stronger UV, though still far from Mars.</Measure>
            <Measure term="Low Sun (Moon)">How low the Sun stays in the sky, from latitude.</Measure>
            <Measure term="Frozen ground (Moon)">Mean surface temperature below freezing.</Measure>
          </dl>
          <Figure
            className="mt-6"
            value="Top 1.6 %"
            label="of Earth's land on climate alone: that is where our method puts five published Mars analog sites (Qaidam, Atacama, McMurdo Dry Valleys, Lut, Namib). It was never told they exist, and three of our 15 Mars areas fell inside those deserts on their own."
          />
        </Section>

        {/* Step 4 — audit */}
        <Section id="audit" n="Step 4 · Audit" accent="var(--color-similar)" title="Every number, checked twice" onDetails={() => setDetail('audit')}>
          <p className="max-w-3xl leading-relaxed text-ink/90">
            Before the results went on this site, a separate script compared them with things we did not produce: published
            values, well-known places, and the raw data computed again from scratch.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Figure value="158" label="checks passed" />
            <Figure value="1" label="warning, about map resolution; it does not change a result" />
            <Figure value="0" label="failed, after we fixed the 24 errors the audit and our own review turned up" />
          </div>
          <ul className="mt-6 grid gap-x-8 gap-y-2 text-[0.95rem] leading-relaxed text-ink/85 sm:grid-cols-2">
            <Tick>Elevation under 7 Mars landers: within 56 m of the published values</Tick>
            <Tick>Dust maps tested on regions every textbook calls dusty or dark</Tick>
            <Tick>All 37 known analog sites fall in the country their source names</Tick>
            <Tick>Every rule value of all {nMars + nMoon} sites recomputes exactly from the raw data</Tick>
            <Tick>The Mars zones come out the same wherever the map is cut</Tick>
            <Tick>Rainfall, temperature, slopes, brightness and rock type tested at known places</Tick>
            <Tick>Every Earth map tested for being shifted, flipped or mirrored</Tick>
            <Tick>All 24 training areas looked at from orbit: on land and bare</Tick>
          </ul>
        </Section>

        {/* Limits */}
        <section className="mt-20">
          <p className="eyebrow text-different">Where it stops</p>
          <h2 className="headline mt-3 text-3xl sm:text-4xl">What this study cannot tell you</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-4 border-l-2 border-different/70 pl-5 leading-relaxed text-ink/85 md:grid-cols-2">
            <li>This is a first screening at kilometre scale on Mars and 240 m on the Moon. Real site selection uses metre-scale images and takes years.</li>
            <li>
              Rock type on Earth comes from a coarse map (about 50 km), so a place mapped as basalt can be mostly sand on the
              surface. On Mars we take the unit drawn on the USGS geologic map; naming its rock is our step.
            </li>
            <li>Water history on Mars, such as old lakes and deltas, is not scored: no global dataset lets us compare it.</li>
            <li>
              The lunar ridges are steeper than almost any cold, dry, bare place on Earth, so Moon matches are weak (totals
              47–62 against 77–88 for Mars). Two Moon areas were picked for rock and slopes and are nowhere near a pole. The
              reports say so.
            </li>
            <li>No place on Earth has lower gravity, a vacuum, Mars&apos; thin CO₂ air or space radiation. Every report lists this.</li>
            <li>Satellite rainfall reads too high in the driest deserts, so we treat anything under 100 mm a year as fully dry.</li>
            <li>The Mars elevation map is filled in between orbit tracks at its finest scale, so Mars looks a little smoother than it is.</li>
          </ul>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link to="/explore/mars" className="press inline-flex items-center gap-2 rounded-full bg-mars px-6 py-3 font-display font-semibold text-space hover:bg-mars/90">
              See the sites on Mars <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link to="/earth" className="press rounded-full border border-white/25 px-6 py-3 font-display font-medium hover:border-white/60">
              See the places on Earth
            </Link>
          </div>
        </section>
      </article>

      <Drawer open={detail === 'mars'} onClose={() => setDetail(null)} eyebrow="Step 1 · Mars" title="Thresholds, formulas and the zones">
        <Detail title="Where each limit comes from">
          <Table
            head={['Rule', 'Limit', 'Basis']}
            rows={[
              ['Air to brake in', 'Elevation ≤ −1 km, shown as surface pressure ≥ 668 Pa', 'Curiosity (MSL)'],
              ['Winter sunlight', '|latitude| ≤ 30°, shown as winter noon Sun ≥ 34.8°', 'MSL, Mars 2020'],
              ['Firm ground', 'Thermal inertia ≥ 100 J m⁻² K⁻¹ s⁻½', 'MSL, Mars 2020'],
              ['Firm ground, second check', 'Albedo ≤ 0.25 where thermal inertia is below 150', 'MSL, Mars 2020'],
              ['Slope', '≤ 3° between map cells 3.7 km apart', 'MSL: 3° over 2–5 km'],
              ['Relief', '≤ 500 m over ~18 km', 'Ours'],
            ]}
          />
          <p>
            Curiosity&apos;s engineers set slope limits at four scales: 3° over 2–5 km, 5° over 200–500 m, and 15° over 20–40 m and
            over 5 m. A global elevation map can only see the first, so that is the one we apply. The others need images
            that exist for a few places only.
          </p>
          <p>
            Dust has two signatures. It holds little heat (low thermal inertia) and it is bright (high albedo). Curiosity&apos;s
            guide rules out ground with thermal inertia below 100 and albedo above 0.25; Perseverance&apos;s team flags
            anything below about 150 that is also bright. We use both.
          </p>
        </Detail>
        <Detail title="Formulas">
          <Formula>pressure = 610 Pa × exp(−elevation / 11.1 km)</Formula>
          <Formula>winter noon Sun = 90° − |latitude| − 25.19°</Formula>
          <p>610 Pa is the mean surface pressure at the zero level of the elevation map, 11.1 km the scale height of Mars&apos; atmosphere, 25.19° its axial tilt.</p>
        </Detail>
        <Detail title="The zones, measured">
          <SiteTable sites={candidates('mars')} />
          <p>
            Second look on a finer map (463 m): 95 % of slopes stay below 0.31° (A), 0.81° (B), 2.31° (C), 0.50° (D) and
            1.36° (E). The same measure gives 0.53° at InSight, 0.94° at Viking 1, 1.49° at Spirit and 10.48° at
            Perseverance. Zone C, on the floor of the Isidis basin, is the roughest of the five; it is still far smoother
            than Jezero crater, where Perseverance landed.
          </p>
          <p>
            All five lie in the northern lowlands or on Meridiani Planum. South of the equator most ground is too high
            for the air-to-brake rule, and the patches that do pass are too small to hold a zone 40 km from their edge.
          </p>
        </Detail>
        <Detail title="A place counts as new">
          <p>
            A zone must be more than 500 km from the 11 successful landings and from two landers that reached the ground
            without a working mission: Beagle 2 (Isidis Planitia, 2003) and Schiaparelli (Meridiani Planum, 2016).
          </p>
        </Detail>
        <Detail title="Data">
          <p>
            MOLA topography at 16 pixels per degree (about 3.7 km) and at 463 m; thermal inertia and albedo from the TES
            instrument on Mars Global Surveyor at 8 pixels per degree; names from the USGS Gazetteer of Planetary
            Nomenclature.
          </p>
        </Detail>
      </Drawer>

      <Drawer open={detail === 'moon'} onClose={() => setDetail(null)} eyebrow="Step 1 · Moon" title="Why 50 %, why 84° S, and the three ridges">
        <Detail title="Why 50 % sunlight is a high bar here">
          <p>Typical sunlit time on flat ground, by latitude. Near the pole flat ground is lit least, so a spot that reaches 50 % there is a ridge that stands in the light.</p>
          <Table
            head={['Latitude', 'Flat ground lit']}
            rows={[
              ['86–90° S', '20 %'],
              ['84–86° S', '31 %'],
              ['82–84° S', '38 %'],
              ['78–82° S', '39 %'],
              ['75–78° S', '43 %'],
            ]}
          />
          <p>Further from the pole many spots pass the numbers through an ordinary two-week day and night. That is why we only took sites beyond 84° S.</p>
        </Detail>
        <Detail title="How the three were picked">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Best overall: the best-lit passing spots (sunlit time + ¼ of Earth-in-view time), at least 30 km apart.</li>
            <li>Outside NASA&apos;s regions: more than 40 km from every Artemis III named feature, and at least as well lit as our weakest other site. Only one spot met this.</li>
            <li>The surroundings of each site (about 720 m) must pass every rule, not just one map cell.</li>
            <li>
              Only shadowed areas of at least 1 km² count as a place to look for ice. The map holds about 36,000 patches of
              permanent shadow; fewer than 4,000 are that large.
            </li>
          </ul>
        </Detail>
        <Detail title="The three ridges, measured">
          <SiteTable sites={candidates('moon')} />
        </Detail>
        <Detail title="Data">
          <p>NASA PGDA products from the LOLA laser altimeter: average illumination, Earth visibility and permanently shadowed regions at 120 m, and the LOLA slope map at 240 m, all compared on a 240 m grid. The slope map has no value where no laser track crossed a pixel (29 % of it); those pixels are left out, and ground with no measurement cannot pass.</p>
        </Detail>
      </Drawer>

      <Drawer open={detail === 'check'} onClose={() => setDetail(null)} eyebrow="Step 2 · Check" title="Every past landing, rule by rule">
        <Detail title="Mars: our rules, and why each mission went there">
          <Table
            head={['Landing', 'Our rules', 'Why the mission went there']}
            rows={[
              ['Viking 1 (1976)', 'Passes', 'Images, atmosphere, soil and a search for life; site picked from orbiter pictures'],
              ['Mars Pathfinder (1997)', 'Passes', 'To prove a low-cost landing; a flood plain that looked safe and held many kinds of rock'],
              ['Spirit (2004)', 'Passes', 'Signs of past water; Gusev crater looks like a lake bed'],
              ['Opportunity (2004)', 'Passes', 'Signs of past water; hematite, a mineral that forms in water, on a very smooth plain'],
              ['InSight (2018)', 'Passes', 'The interior of Mars; site chosen for safety, not for its surface'],
              ['Zhurong (2021)', 'Passes', "China's first rover, on the plains of southern Utopia Planitia"],
              ['Curiosity (2012)', 'Fails relief: 1,406 m', 'Past habitability; it climbs the layered mountain inside Gale crater, which is in our 18 km window'],
              ['Perseverance (2021)', 'Fails relief: 517 m', 'Signs of ancient life; the river delta and rim of Jezero crater are in our window'],
              ['Viking 2 (1976)', 'Fails winter sunlight', 'Same goals as Viking 1, at 48° N; nuclear powered, so the low Sun did not matter'],
              ['Phoenix (2008)', 'Fails winter sunlight', 'Went to 68° N on purpose, to reach water ice in the ground'],
              ['Mars 3 (1971)', 'Fails air, sunlight, relief', 'Landed at 45° S on high, rough ground; we found no source for why'],
            ]}
          />
          <p>
            Curiosity and Perseverance are the two landings that fail a terrain rule, and they are the two that carried
            guided landing systems so that they could land next to steep ground.
          </p>
        </Detail>
        <Detail title="Each landing against its own mission's limits">
          <p>Every mission wrote limits for its own spacecraft. Checked with our elevation map, all seven we could find pass.</p>
          <Table
            head={['Landing', 'Elevation limit', 'Our map', 'Latitude band', 'Landed at']}
            rows={[
              ['Mars Pathfinder', 'below 0 km', '−3.68 km', '10° N to 20° N', '19.1° N'],
              ['Spirit', 'below −1.3 km', '−1.93 km', '15° S to 5° N', '14.6° S'],
              ['Opportunity', 'below −1.3 km', '−1.38 km', '5° S to 15° N', '1.9° S'],
              ['Phoenix', 'below −3.5 km', '−4.13 km', '65° N to 72° N', '68.2° N'],
              ['Curiosity', 'below −1 km', '−4.49 km', '30° S to 30° N', '4.6° S'],
              ['InSight', 'below −2.5 km', '−2.60 km', '3° N to 5° N', '4.5° N'],
              ['Perseverance', 'below −0.5 km', '−2.56 km', '30° S to 30° N', '18.4° N'],
            ]}
          />
          <p>One more test: Oxia Planum, the site ESA chose for the Rosalind Franklin rover, passes every one of our rules.</p>
        </Detail>
        <Detail title="Moon">
          <Table
            head={['Artemis III feature', 'Passing ground within 25 km', 'Best sunlit']}
            rows={[
              ['Malapert Massif', 'Yes', '65.9 %'],
              ['Mons Mouton', 'Yes', '64.8 %'],
              ['de Gerlache Rim 2', 'Yes', '68.9 %'],
              ['Slater Plain', 'Yes', '68.2 %'],
              ['Peak near Cabeus B', 'No', '41.4 %'],
              ['Haworth', 'No', '34.0 %'],
              ['Nobile Rim 1 and 2', 'No', '41.5 %'],
            ]}
          />
          <p>NASA gives no coordinates for the regions, so we measure around the named feature, taken from the USGS Gazetteer of Planetary Nomenclature.</p>
        </Detail>
        <Detail title="Moon: three real landings">
          <Table
            head={['Landing', 'Sunlit', 'Earth in view', 'Slope', 'To shadow', 'Why it went there']}
            rows={[
              ['Chandrayaan-3 (2023), 69° S', '48.3 % ✗', '100 %', '0.8°', 'none in 30 km ✗', 'To show a soft landing and a rover drive, for one lunar day'],
              ['IM-1 Odysseus (2024), 80° S', '39.1 % ✗', '100 %', '11.0° ✗', '8.1 km', 'To learn about terrain and radio links near the pole before crews go'],
              ['IM-2 Athena (2025), 85° S', '46.5 % ✗', '92.3 %', '2.7°', '6.6 km', 'To drill for water ice on Mons Mouton'],
            ]}
          />
          <p>
            All three were built to work for about one lunar day, so they needed two weeks of daylight, not light all
            year. That is the difference between a landing site and a base site, and it is what our sunlight rule
            measures. IM-1 came to rest on a 12° slope and tipped over; our map reads 11° at that spot.
          </p>
        </Detail>
      </Drawer>

      <Drawer open={detail === 'match'} onClose={() => setDetail(null)} eyebrow="Step 3 · Match" title="How a place on Earth gets its score">
        <Detail title="First pass: climate, everywhere">
          <p>
            All land on a 0.25° grid, from satellite data: rainfall averaged over June 2000 – May 2023 (GPM IMERG), and for
            2023 vegetation, land cover, ground brightness and surface temperature by day and night (MODIS). Water is left
            out (a cell must be at least 90 % land on two independent maps), and so are ice sheets; ice-free ground such as
            the Antarctic Dry Valleys stays in. The 100 best cells per world, at least 200 km apart, go on to the next pass
            together with every published analog site.
          </p>
        </Detail>
        <Detail title="Second pass: each site">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Terrain: all slopes inside a 25 km window at the site (MOLA 463 m or LOLA 240 m elevation) against the same on
              Earth (Copernicus DEM, averaged to the same pixel size and measured the same way). The two distributions are
              compared with the Wasserstein distance W, and the score is exp(−W / 3°).
            </li>
            <li>Rock type: the rock class at the site against the GLiM global lithological map (Hartmann and Moosdorf, 2012).</li>
            <li>Because the climate pass found almost no basalt or anorthosite, the 40 best-climate cells of each expected rock class are added.</li>
            <li>Surface brightness (Mars): albedo from the TES instrument at the site against MODIS albedo on Earth, without snow. A difference of 0.20 scores 0.</li>
            <li>Thin air (Mars): mean elevation of the window. 5,000 m scores 100; the air there is still about 90 times denser than on Mars.</li>
            <li>A place with any score missing gets no total, so a gap in the data never helps it.</li>
          </ul>
        </Detail>
        <Detail title="The rock at each Mars zone">
          <p>Read from the USGS global geologic map of Mars (Tanaka et al., 2014) at the zone&apos;s coordinates.</p>
          <Table
            head={['Zone', 'Mapped unit', 'Rock we look for on Earth']}
            rows={[
              ['A · Southern Utopia Planitia', 'AHv, Amazonian and Hesperian volcanic', 'Basalt'],
              ['B · Northern Elysium Planitia', 'AHv', 'Basalt'],
              ['C · Western Isidis Planitia', 'eHv, Early Hesperian volcanic', 'Basalt'],
              ['D · Chryse–Acidalia plains', 'lHt, Late Hesperian transition', 'Mixed sediments'],
              ['E · Eastern Meridiani Planum', 'HNhu, where Opportunity landed', 'Sandstone, as Opportunity found'],
            ]}
          />
          <p>For the Moon it is the anorthosite-rich highland crust of the south pole.</p>
        </Detail>
        <Detail title="Choosing three, writing the report">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>A training area must be at least 90 % land, under 25 % permanent ice and bare all year (vegetation index at most 0.30).</li>
            <li>No place serves two sites of the same world. When two sites want the same place, it goes to the one it fits better.</li>
            <li>A site&apos;s three places are at least 500 km apart.</li>
            <li>A place within 50 km of a published analog site, or in the same named desert within 400 km, is marked as known. At least one of the three must be new.</li>
            <li>A dimension that scores 70 or more becomes a &quot;similar&quot; line and a suggested test; 40 or less becomes a &quot;different&quot; line.</li>
          </ul>
        </Detail>
        <Detail title="Does it find the known analogs?">
          <Table
            head={['Published analog site', 'Rank on climate']}
            rows={[
              ['Qaidam Basin, China', 'top 0.1 %'],
              ['Atacama, Chile', 'top 0.3 %'],
              ['McMurdo Dry Valleys, Antarctica', 'top 1.0 %'],
              ['Lut Desert, Iran', 'top 1.1 %'],
              ['Namib Desert, Namibia', 'top 1.6 %'],
              ['Haughton crater, Canada (for the Moon)', 'top 0.4 %'],
            ]}
          />
          <p>
            Three of our 15 Mars areas lie in the Lut, the Atacama and the Qaidam Basin, 140 to 300 km from the spots the
            papers used; their reports are marked as known regions. The published spots themselves rank in the middle of
            our final lists, mostly because the rock map calls them loose sediment.
          </p>
          <p>It does not find Lake Salda as a match for Jezero crater: that likeness is in carbonate minerals and a lake delta, and no global dataset we have covers those.</p>
        </Detail>
      </Drawer>

      <Drawer open={detail === 'audit'} onClose={() => setDetail(null)} eyebrow="Step 4 · Audit" title="What was checked, and what it caught">
        <Detail title="What each number was compared with">
          <Table
            head={['Area', 'Reference']}
            rows={[
              ['Math', 'A synthetic 10° slope, identical distributions, the pressure formula at zero elevation'],
              ['Inputs', '37 analog coordinates against country borders; 7 Artemis features against the USGS Gazetteer'],
              ['Mars data', 'Published elevations of 7 landing sites; a second elevation map around Gale crater; dust in Tharsis, Arabia and Amazonis, none on Syrtis Major; each mission against its own limits'],
              ['Moon data', 'Shackleton crater floor in shadow; total shadowed area against Mazarico et al. (2011); the 12° slope where IM-1 tipped over'],
              ['Earth data', 'Rainfall at eight known places, temperature at Dome Fuji, salt flats flat, Alps steep, basalt in Iceland, a sand sea bright and a lava field dark; every map against the coastline or another map, shifted and flipped'],
              ['Outputs', 'Every sentence in a report agrees with its score; every total is the weighted sum of its scores; every area inland, bare and free of ice; no missing values'],
            ]}
          />
        </Detail>
        <Detail title="Errors the audit turned up">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Two Artemis feature coordinates were 8 and 17 km off. With the right ones, 4 of 7 features have passing ground, not 5.</li>
            <li>Satellite rainfall reads too high in the driest deserts (Atacama: 59 mm against about 2 mm measured). Rain under 100 mm a year now counts as fully dry.</li>
            <li>Some report sentences showed missing values, and Moon reports suggested a life-detection test. Both fixed.</li>
            <li>Four of the 16 examples of past field tests did not match their sources. They were corrected or removed.</li>
            <li>Six training areas were on frozen Arctic sea, and five Moon areas on ice caps. Land now has to be at least 90 % land on two maps, and a training area mostly bare ground; all nine Moon areas changed.</li>
          </ul>
        </Detail>
        <Detail title="Errors found on the last day, in the screening itself">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              On Mars the dust map was read half a planet away from the elevation map. Pathfinder, Opportunity and Zhurong
              looked dusty when they are not, and two of our four zones stood on dust. With the maps aligned, 6 of 11
              landings pass every rule (it was 4) and the zones were chosen again.
            </li>
            <li>
              The software that reads the Mars maps placed them one cell (3.7 km) off. Positions now come from the data
              labels and are tested against a second, finer map. This is why Curiosity used to read 400 m too high.
            </li>
            <li>
              Choosing zones stopped at the edge of the map at 180° and tried only one point per safe area, which dropped
              the second and third largest safe areas on Mars. Both fixed; the result no longer depends on where the map is cut.
            </li>
            <li>A correction made the day before was itself wrong: Perseverance&apos;s elevation limit is below −0.5 km, as first written.</li>
            <li>
              On the Moon any speck of permanent shadow counted as ice within reach. Now only shadowed areas of 1 km² or
              more count. The three ridges stayed the same.
            </li>
          </ul>
        </Detail>
        <Detail title="Errors found on the last day, on the Earth side">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              The rock expected at two Mars zones was a guess (basin sediments). The USGS geologic map draws lava plains
              there, so both are now matched to basalt.
            </li>
            <li>
              Earth slopes were read from one elevation tile, which cut the 25 km window at the tile edge and made Arctic
              ground look up to 40 % steeper than it is. The window is now put together from every tile it touches.
            </li>
            <li>A place with a missing score ranked above one with a known mismatch. Now every score must exist.</li>
            <li>Rain came from a single year, vegetation and temperature from four months. Now 23 years and 12 months.</li>
            <li>Areas inside the Atacama, the Qaidam Basin and the Lut were called new. They are now marked as known regions.</li>
            <li>Sites picked their places in list order, and some Moon areas were green tundra or glaciers. Both fixed.</li>
            <li>
              The Moon slope map has no value in 29 % of its cells, and those were read as 45° cliffs. No unsafe ground
              passed because of it, and the three ridges did not change, but the passing area was 19 km² and is 63 km². For
              the terrain match, lunar slopes are now computed from the elevation map the same way as on Earth.
            </li>
          </ul>
        </Detail>
        <Detail title="The one warning">
          <p>
            On the Moon, our 240 m grid slightly enlarges shadowed areas, which can shorten a distance to shadow by at
            most 0.24 km.
          </p>
        </Detail>
      </Drawer>
    </main>
  )
}

function FlowStep({ n, href, title, text }: { n: number; href: string; title: string; text: string }) {
  return (
    <li className="bg-space/80">
      <a href={href} className="group block h-full p-5 transition-colors hover:bg-white/[0.04]">
        <p className="eyebrow text-ink-muted">Step {n}</p>
        <p className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold">
          {title}
          <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </p>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-muted">{text}</p>
      </a>
    </li>
  )
}

function Section({ id, n, accent, title, onDetails, children }: { id: string; n: string; accent: string; title: string; onDetails: () => void; children: ReactNode }) {
  return (
    <section id={id} className="mt-20 scroll-mt-24" style={{ '--body-accent': accent } as CSSProperties}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow text-accent">{n}</p>
          <h2 className="headline mt-3 text-3xl sm:text-4xl">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onDetails}
          className="press inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 font-display text-sm font-medium hover:border-accent hover:text-accent"
        >
          <Plus className="size-4" aria-hidden="true" /> Details
        </button>
      </div>
      {children}
    </section>
  )
}

function RuleCard({ title, limit, basis, ours = false, children }: { title: string; limit: string; basis: string; ours?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white/[0.03] p-4">
      <h3 className="font-display text-[1.1rem] leading-tight font-semibold">{title}</h3>
      <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-muted">{children}</p>
      <p className="mt-auto pt-4 font-mono text-[0.8rem] text-accent">{limit}</p>
      <p className={`mt-1.5 text-[0.75rem] ${ours ? 'text-ink/85' : 'text-ink-muted'}`}>{ours ? 'Our own limit' : `From ${basis}`}</p>
    </div>
  )
}

function Figure({ value, label, className = '', children }: { value: string; label: string; className?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line p-5 ${className}`}>
      <p className="font-display text-5xl leading-none font-semibold text-accent tabular-nums">{value}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/85">{label}</p>
      {children}
    </div>
  )
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.1rem_1fr] gap-x-2">
      <Check className="mt-1 size-4 text-similar" strokeWidth={2.5} aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

function Outcome({ pass = false, names, children }: { pass?: boolean; names: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.5rem_1fr] gap-x-2.5">
      <span className={`mt-0.5 flex size-5 items-center justify-center rounded-full ${pass ? 'bg-similar/15' : 'bg-different/15'}`}>
        {pass ? <Check className="size-3 text-similar" strokeWidth={3} aria-label="Passes" /> : <X className="size-3 text-different" strokeWidth={3} aria-label="Does not pass" />}
      </span>
      <div>
        <p className="font-display font-medium">{names}</p>
        <p className="mt-0.5 text-[0.9rem] leading-relaxed text-ink-muted">{children}</p>
      </div>
    </li>
  )
}

/** The weight of each dimension in the total, drawn to scale. */
function Weights({ world, parts }: { world: string; parts: { label: string; share: number }[] }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="eyebrow text-ink-muted">{world}</p>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {parts.map((p, i) => (
          <span key={p.label} className="h-full bg-accent" style={{ width: `${p.share}%`, opacity: 1 - i * (0.75 / parts.length) }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[0.9rem]">
        {parts.map((p) => (
          <li key={p.label} className="flex items-baseline justify-between gap-3">
            <span className="text-ink/85">{p.label}</span>
            <span className="font-mono text-ink tabular-nums">{p.share} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Measure({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-display font-medium">{term}</dt>
      <dd className="mt-1 text-[0.9rem] leading-relaxed text-ink-muted">{children}</dd>
    </div>
  )
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="eyebrow text-ink">{title}</h3>
      {children}
    </section>
  )
}

function Formula({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-line bg-white/[0.04] px-3.5 py-2.5 font-mono text-[0.8rem] text-ink">{children}</p>
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-[0.85rem]">
        <thead>
          <tr className="border-b border-line bg-white/[0.04]">
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-display font-medium text-ink">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2 align-top ${i === 0 ? 'text-ink' : 'text-ink/80'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Our sites with the value of every rule, straight from sites.json. */
function SiteTable({ sites }: { sites: Site[] }) {
  if (sites.length === 0) return null
  const criteria = sites[0].selection.criteria
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-[0.8rem]">
        <thead>
          <tr className="border-b border-line bg-white/[0.04]">
            <th scope="col" className="px-3 py-2 font-display font-medium">
              Site
            </th>
            {criteria.map((c) => (
              <th key={c.id} scope="col" className="px-3 py-2 font-display font-medium">
                {c.label.replace(/ \(.*\)$/, '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sites.map((s) => (
            <tr key={s.id}>
              <th scope="row" className="px-3 py-2 align-top font-normal text-ink">
                {s.name}
              </th>
              {s.selection.criteria.map((c) => (
                <td key={c.id} className="px-3 py-2 align-top font-mono whitespace-nowrap text-ink/85 tabular-nums">
                  {c.value ?? '—'} {pretty(c.unit).replace('J m⁻² K⁻¹ s⁻½', '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
