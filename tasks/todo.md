# todo

## vima agent cli and skill

- [x] inspect existing backend cli/api split and package conventions
- [x] add standalone public cli package without backend/runtime dependencies
- [x] add portable skill template plus print/install commands
- [x] document one-command agent usage
- [x] run package tests and entrypoint smoke checks

### result

- added `packages/vima-agent` as a stdlib-only python cli package with a `vima`
  console script.
- implemented `doctor`, `analyze`, `compare`, `cii summary`, `cii frames`,
  `zones`, `eval`, `skill print`, and `skill install`.
- documented `uvx vima-agent@latest ...` in the package README and root README.
- verification passed: 7 package tests, clean temp-venv install, console script
  version check, skill resource readback, live production `doctor`, live cii
  filter, live eval json, and live `analyze --sample masonry-p`.

## hero intro gap tighten

- [x] reduce the offsets between hero intro stages while preserving the sequence order
- [x] verify targeted lint and TypeScript

### result

- tightened stage offsets: large text starts at `hero:metal+=0.82`, small text at `hero:large-text+=0.36`, ctas at `hero:small-text+=0.62`, meta at `hero:cta+=0.32`, scroll at `hero:meta+=0.28`, and nav at `hero:scroll+=0.42`.
- verification passed: targeted eslint and TypeScript.

## post-loader intro trigger

- [x] add a loader-complete signal after the loader fade finishes
- [x] make the hero intro timeline wait for loader-complete instead of loader-release
- [x] remove the early fallback that made the hero intro run behind the loader
- [x] verify targeted lint, TypeScript, and production build

### result

- `VimaLoader` now dispatches `vima-loader-complete` only after the loader fade completes.
- `ScrollMotion` starts the hero intro timeline from `vima-loader-complete`, not `vima-loader-release`, so the sequence runs after the loading screen is gone.
- removed the early timeout fallback that could play the intro behind the loader.
- verification passed: targeted eslint, TypeScript, and production build.

## hero intro gsap sequencing

- [x] inspect the masked-lines SplitText reference and current hero intro timeline
- [x] reorder hero intro: metallic logo, large text, small text, ctas, scroll cue, nav
- [x] tune masked line reveals to follow the reference motion
- [x] verify targeted lint, TypeScript, and production build

### result

- hero intro now uses explicit timeline labels: `hero:metal`, `hero:large-text`, `hero:small-text`, `hero:cta`, `hero:scroll`, and `hero:nav`.
- SplitText text reveals now follow the masked-lines reference more closely: `type: "words,lines"`, `mask: "lines"`, `yPercent: 100`, `opacity: 0`, `stagger: 0.1`, and `expo.out`.
- large text reveals before eyebrow/secondary/pipeline small text; ctas, scroll cue, and nav follow in that order.
- verification passed: targeted eslint, TypeScript, and production build.

## loader caption restore

- [x] move loading status text back under the image aperture
- [x] keep the caption visible through the slower loading sequence
- [x] verify targeted lint and TypeScript

### result

- status caption now sits directly beneath the aperture/image slot instead of below the full wordmark.
- caption fade-out is delayed to `field+=1.12` so it remains visible through more of the slower loading sequence.
- verification passed: targeted eslint and TypeScript.

## loader pacing and jank pass

- [x] slow the png and svg morph transitions
- [x] separate video playback from the heaviest gsap loader window
- [x] reduce simultaneous loader work during the final expansion
- [x] verify targeted lint, TypeScript, and production build

### result

- svg morphs now run `0.82s`, `0.82s`, and `0.9s` instead of the previous quicker hits, with image cover fades stretched to `0.34s` and `0.78s` stagger.
- the video layer reveal is pushed later to `type+=4.32`, the field expansion starts at `4.84`, and the final expansion runs `2.04s`.
- loader video stays paused at frame zero during the heavy gsap work; the actual background playback starts on loader release instead of decoding during the morph window.
- verification passed: targeted eslint, TypeScript, and production build.

## loader abstract morph shapes

- [x] replace literal/simple loader morph paths with more abstract silhouettes
- [x] keep the final morph into the real logo mark
- [x] verify targeted lint and TypeScript

### result

- loader morph now uses source-derived Tabler filled svg paths: `analyze`, `grid-pattern`, and `barrier-block`, then resolves into the real mark in the same 24x24 coordinate space.
- verification passed: targeted eslint and TypeScript.

## loader morph travel pacing

- [x] delay the svg travel toward the hero logo
- [x] slow the travel tween without changing the png morph cadence
- [x] verify targeted lint and TypeScript

### result

- final svg travel now starts at `field+=0.24` instead of immediately at the field reveal, and the travel tween runs `1.18s` with a softer `power2.inOut` ease.
- verification passed: targeted eslint and TypeScript.

## loader metallic handoff pass

- [x] correct loader morph target measurement to ignore hero intro transforms
- [x] keep the metallic hero mark visible under the loader before fade-out
- [x] make loader morph shapes larger and shaded
- [x] verify lint, TypeScript, and production build

### result

- loader svg now targets the hero logo's final layout position instead of the intro-transformed rect.
- the metallic hero mark is revealed underneath before the loader fades, so the svg shell dissolves into an already-present shader instead of disappearing first.
- loader morph shapes are larger and use shaded fill/stroke/filter treatment.
- verification passed: targeted eslint, TypeScript, and production build.

## loader logo morph pass

- [x] check MorphSVG availability and current loader markup
- [x] replace loader logo rotation with shape morphs synced to png swaps
- [x] keep final mark handoff aligned to the hero metallic logo
- [x] verify lint, TypeScript, and production build

### result

- loader overlay now uses `MorphSVGPlugin` to move through three abstract svg shapes during the png cycle, then resolves into the actual hex-nut mark before flying into the hero logo position.
- verification passed: targeted eslint, TypeScript, and production build.

## cta highlight pass

- [x] read `DESIGN.md` before touching the landing visuals
- [x] move the hero cta styling into reusable cta classes
- [x] add a tighter sakura hairline/glint highlight to the primary and secondary hero ctas
- [x] align the hex cta hover/focus highlight with the same visual language
- [x] verify targeted lint, TypeScript, desktop/mobile render, hover state, and overflow

### result

- hero ctas now use `.hero-cta-button` classes with inner rails, controlled sakura glow, and focus-visible outlines.
- hex ctas got matching inner rails plus a stronger hover/focus highlight.
- verification passed: targeted eslint, TypeScript, browser hover probe, desktop/mobile screenshots, and no horizontal overflow.

## local folder rename

- [x] rename local repo folder from `vinna` to `vima`
- [x] stop the stale dev process that was recreating the old generated `.next` stub
- [x] restart the dev server from the new `vima` path
- [x] verify old folder is gone, git root points at `vima`, old absolute-path references are gone, and `/` responds

### result

- repo now lives at `/Users/stephenhung/Documents/GitHub/vima`.
- `localhost:3000` is running from the renamed folder.

## vima rebrand

- [x] parallelize docs/context pass with a subagent
- [x] refactor frontend brand text, component names, css hooks, events, and public media filenames to vima
- [x] update backend/demo/proof/experiment/paper brand-facing strings to VIMA/vima while preserving real repo/local paths
- [x] verify lint, TypeScript, python compile, route responses, media asset responses, and browser-rendered wordmarks

### result

- landing and demo now render `vima` / `v i m a.`; legacy brand text/classes are absent from the browser readback.
- renamed landing components to `vima-loader`, `vima-navbar`, and `vima-telemetry-feed`, plus the public `vima-*` media assets.
- left actual repo references like `philip-chen6/vinna` and local workspace paths that still point to the real folder.

## nav click scroll pacing

- [x] inspect navbar and shared hash scroll handlers
- [x] slow the programmatic nav scroll tween without changing free scrolling
- [x] verify targeted lint, TypeScript, and route response

### result

- nav and hash-link clicks now tween for `1.28s` with a softer in-out ease instead of the previous quick jump.
- free wheel/touch scrolling is unchanged.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and source check confirms the old nav click duration/fallback values are gone.

## purge layered scroll

- [x] remove `data-page-layer` from existing landing sections and footer
- [x] remove the shared ScrollTrigger pinning block from `ScrollMotion`
- [x] remove the css sticky fallback for layered sections
- [x] verify lint, TypeScript, route response, no layer attrs, no stack section, normal section positioning, and browser errors

### result

- purged the layered scroll experiment from the active landing page.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, `0` `data-page-layer` attrs, no `data-page-layer-ready`, no `#stack`, all target sections compute as `position: relative`, desktop/mobile overflow `0`, and no runtime errors.

## hero scroll cue cleanup

- [x] read `DESIGN.md` before touching hero UI
- [x] replace the hero bottom metadata row with a simple downward scroll cue
- [x] verify targeted lint, TypeScript, route response, and rendered markup

### result

- replaced the hero bottom `HackTech 2026 · Ironsite track` / `scroll for evidence` row with a single `scroll` link and downward arrow.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, rendered markup includes the new scroll cue, and source search confirms the old `scroll for evidence` copy is gone.

## hero wordmark glow

- [x] add a soft sakura glow around the main hero `v i m a.` wordmark
- [x] verify lint, TypeScript, route response, and rendered hero glow

### result

- added a soft radial bloom behind the hero wordmark and layered `drop-shadow` glow on the metallic `v i m a.` glyph wrapper.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, browser computed the wordmark glow filter, and desktop overflow stayed `0`.

## existing section layered scroll

- [x] remove the newly added `field stack` section from the landing route
- [x] mark the existing hero, evidence, ledger, pipeline, settlement, and footer as layered scroll panels
- [x] move the layered pinning behavior into the shared ScrollMotion layer
- [x] add a css sticky fallback for desktop and disable it on mobile/reduced motion
- [x] verify lint, TypeScript, route response, panel targets, desktop/mobile overflow, and absence of the extra stack section

### result

- the landing page now layers the existing sections: `top`, `evidence`, `ledger`, `pipeline`, `cta`, and `footer`.
- removed all route usage of the accidental `field stack` section and reset settlement to divider index `04`.
- kept the reference-style `pinSpacing: false` behavior in `ScrollMotion`, with css sticky fallback if hydration is late.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, 6 existing panels detected, no `#stack` section rendered, desktop overflow `0`, mobile overflow `0`, and no browser runtime errors.

## react bits confidence graph pass

- [x] read `DESIGN.md` and the local React Bits Pro skill guidance
- [x] mount the React Bits `SimpleGraph` in the evidence section
- [x] adapt it to the existing receipt confidence data and vima palette
- [x] verify targeted lint, TypeScript, route response, and rendered graph markup

### result

- added a React Bits `SimpleGraph` confidence trace between the evidence stats ribbon and proof atlas.
- reused the existing ledger receipt confidence values so the graph tracks real landing-page proof data.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and rendered markup includes the graph class, copy, and frame labels.

## footer spacing pass

- [x] inspect footer markup and responsive css
- [x] move footer metadata out of the skinny third column
- [x] widen builder chips by switching desktop builders to two columns
- [x] verify lint, TypeScript, route response, and desktop/mobile footer layout

### result

- footer shell now uses two desktop columns with metadata as a full-width bottom row instead of a cramped third column.
- builder chips are wider on desktop, and footer links/builders stack into full-width rows on mobile.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop footer overflow `0`, and mobile footer overflow `0`.

## proof scroll isolation

- [x] remove wheel/touch/pointer-driven tab switching from the proof section
- [x] verify targeted lint, TypeScript, route response, and removed observer source

### result

- proof tabs no longer respond to wheel/touch/pointer scroll gestures; they only change through the tab controls or keyboard navigation.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and source check confirms the proof component no longer imports or registers `Observer`.

## proof detail layout

- [x] move proof tab descriptive copy off the selector side
- [x] resize the proof detail panel so text does not clip
- [x] verify targeted lint, TypeScript, route response, and markup placement

### result

- moved the proof tab body/details panel out of the selector rail and into the right media column above the image.
- widened the detail panel and made rows horizontal on desktop, stacked on mobile.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and rendered markup places `evidence-tab-panel-wrap` after `evidence-tabs-media-head`.

## navbar anchor rebound fix

- [x] reproduce the nav jump rebound with scroll position tracing
- [x] identify the split brain between ScrollSmoother transform position and native smooth scroll position
- [x] disable global native smooth scrolling so GSAP is the only scroll authority
- [x] switch navbar and in-page hash links to the official `ScrollSmoother.scrollTo()` API
- [x] verify lint, TypeScript, route response, and scroll trace without snap-back

### result

- fixed the rebound by removing global native smooth scrolling and routing hash jumps through `ScrollSmoother.scrollTo()`.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and browser traces for proof / ledger / pipeline all landed at `top: 92` with `rebound: false`.

## section divider single line

- [x] remove the highlighted divider band and boxed label treatment
- [x] keep section separation as a single stronger gradient rule
- [x] verify lint, TypeScript, route response, and rendered divider markup

### result

- section dividers are back to a single 2px gradient rule with no boxed label or highlighted band.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and rendered divider markup checks.

## masked hero subtext reveal

- [x] inspect the local `masked-lines-with-splittext` reference
- [x] adapt the masked line reveal into the hero boot timeline
- [x] verify lint, TypeScript, and desktop/mobile rendered split lines

### result

- changed the hero primary copy, secondary copy, and pipeline trail from whole-block fades into SplitText masked line reveals.
- kept the animation inside the existing master intro timeline so it still follows the loader/brand lane and does not pop independently.
- verification passed: targeted eslint, TypeScript, desktop split line count `4`, mobile split line count `7`, copy visible after intro, and no horizontal overflow.

## pink streaks and media wells

- [x] add restrained sakura streak accents across landing sections
- [x] add abstract/picture-ready wells to the pipeline map
- [x] use existing figure assets so the wells read as real media, not empty boxes
- [x] verify lint, TypeScript, desktop render, image loading, console errors, and mobile overflow

### result

- added `landing-pink-streak` accents to evidence, ledger, pipeline, and cta.
- added three pipeline media wells for frame crop, zone map, and payout trace using existing figure assets.
- verification passed: targeted eslint, TypeScript, desktop found 4 visible streaks and 3 loaded media wells, route stayed visible, mobile overflow was `0`, all 3 media wells stayed in viewport, and browser logs were clean.

## opengraph image

- [x] choose a better social card direction from the landing hero
- [x] generate a 1200x630 static og image
- [x] point site open graph and twitter metadata at the new image
- [x] verify targeted lint, TypeScript, image route, and rendered metadata

### result

- generated `frontend/public/og-image.png` as a 1200x630 landing-hero social card using the yozakura background, vima mark, wordmark, tagline, and proof metrics.
- updated shared seo config to use `/og-image.png` for site open graph and twitter cards.
- corrected og image dimensions to 1200x630.
- verification passed: targeted eslint, TypeScript, `/og-image.png` HTTP 200, and rendered metadata points og/twitter images at the new png.

## section divider visibility

- [x] make section divider bars taller and more apparent
- [x] add stronger top/bottom hairlines and a brighter center rail
- [x] make divider index/target labels easier to scan
- [x] verify lint, TypeScript, route response, and rendered divider markup

### result

- section dividers now render as 62px instrument-rule bands with stronger top/bottom lines, a brighter center rail, boxed indices, and clearer target labels.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and rendered divider markup checks for the section targets.

## navbar anchor scroll hitch

- [x] reproduce the freeze during navbar section jumps and capture frame-gap evidence
- [x] trace the competing work during the jump: smoother tween, reveal batches, video, and shader rendering
- [x] shorten and simplify hash-scroll easing
- [x] defer reveal batches until programmatic scroll settles
- [x] pause decorative video and shader rendering during navbar jumps
- [x] verify lint, TypeScript, route response, and browser scroll behavior

### result

- reduced navbar hash jumps from a long `power3.inOut` tween to a shorter `power2.out` tween.
- programmatic hash jumps now set a shared scroll flag, defer section reveal batches until the jump settles, and pause decorative videos / shader rendering during the jump.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and browser nav jumps to proof / ledger / pipeline landed at the section offset with `0` frame gaps over `50ms` and no long tasks in the measured run.

## pipeline route endpoint fix

- [x] measure the route endpoint against the settle node in browser coordinates
- [x] move the svg route endpoint up so it lands on the settle node
- [x] verify lint, TypeScript, and endpoint alignment

### result

- updated the pipeline route path endpoint from `930 118` to `930 80`.
- verification passed: targeted eslint, TypeScript, and browser geometry now reports the route endpoint inside the settle node with delta `x: 1`, `y: 0`.

## hex cta animation speed

- [x] speed up the cta sweep animation
- [x] speed up the hex cell pulse and rotation timings
- [x] verify lint, TypeScript, route response, and rendered animation CSS

### result

- changed sweep from `4.8s` to `3s`.
- changed cell pulse from `2.6s` to `1.65s` with tighter stagger.
- changed frame/core spin from `8s` / `5.6s` to `5.2s` / `3.6s`.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and CSS timing checks.

### correction

- user meant the cta background shader, not the small css hex icon.
- restored the css hex icon timings and changed the final cta `HeroShader` speed from `0.45` to `1.05`.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, shader speed check, and restored css hex icon timing checks.

## favicon update

- [x] add vima hex mark svg app icon
- [x] update metadata and json-ld logo to use the new icon
- [x] verify targeted lint, TypeScript, and icon route response

### result

- added `frontend/app/icon.svg` with the vima hex mark in the yozakura palette.
- updated metadata icon links and organization json-ld logo to use `/icon.svg`.
- verification passed: targeted eslint, TypeScript, `/icon.svg` HTTP 200, and rendered head includes the svg icon link.

## footer github chip layout

- [x] put each builder name on the first line
- [x] move each github username to its own second line
- [x] verify lint, TypeScript, route response, and rendered builder markup

### result

- builder chips now stack name and github handle as two lines inside the same clickable link.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and rendered footer includes all builder names and handles.

## seo metadata pass

- [x] add complete root metadata for title, description, canonical, open graph, twitter, robots, and icons
- [x] add shared seo config with configurable production url
- [x] add json-ld structured data
- [x] add robots and sitemap routes
- [x] add demo route metadata
- [x] verify targeted lint, TypeScript, and seo route responses

### result

- added `frontend/lib/seo.ts` for shared title, description, keywords, og image, repo/devpost links, and configurable `NEXT_PUBLIC_SITE_URL`.
- expanded root metadata with canonical, open graph, twitter cards, robots directives, authors, icons, viewport, and organization json-ld.
- added landing page website/software json-ld.
- added `/robots.txt`, `/sitemap.xml`, and `/demo` route metadata.
- verification passed: targeted eslint, TypeScript, `/`, `/demo`, `/robots.txt`, and `/sitemap.xml`; rendered html includes title, description, og, twitter, and json-ld tags.

## gsap spatial pipeline map

- [x] accept that proof and pipeline had the same left-controls/right-panel composition
- [x] replace the tabbed pipeline stepper with a spatial route map
- [x] use GSAP `ScrollTrigger` to redraw the route and `MotionPathPlugin` to move packets through the flow
- [x] keep node selection interactive without copying the proof atlas pattern
- [x] verify lint, TypeScript, desktop interaction, packet movement, canvas texture, console errors, and mobile overflow

### result

- rebuilt `components/landing/pipeline-stepper.tsx` as a spatial route map: capture → classify → anchor → settle.
- added animated claim packets moving along an SVG route via GSAP `MotionPathPlugin`.
- made the route visible by default so direct `#pipeline` jumps cannot leave it hidden, then GSAP redraws it as progressive enhancement.
- verification passed: targeted eslint, TypeScript, desktop anchor-node click updated the receipt, packet motion was detected, route dash offset was `0px`, canvas texture rendered with `77` nonblank samples, mobile overflow was `0`, and browser logs were clean.

## footer video depth

- [x] make the footer video band taller so more of the scene is visible
- [x] move the footer fade seam and bounce overlay to match the larger media band
- [x] verify lint, TypeScript, route response, and rendered footer sizing

### result

- footer video band now uses `clamp(190px, 26vw, 340px)` instead of the thinner `clamp(118px, 18vw, 220px)`.
- moved the footer panel offset, fade seam, and bounce overlay down to match the larger video area.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and rendered footer sizing checks.

## footer logo inline alignment

- [x] move the footer svg into the same heading row as `v i m a.`
- [x] size the mark in ems so it tracks the wordmark scale
- [x] verify lint, TypeScript, route response, and rendered footer markup

### result

- footer mark now renders inside the same `h2` as `v i m a.`, with em-based sizing for inline alignment.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and rendered markup has svg + wordmark in `.landing-footer-wordmark`.

## header gradient cleanup

- [x] reduce landing header gradient to white and pink only
- [x] verify targeted lint, TypeScript, and route response

### result

- changed `HEADING_GRADIENT` to `#f7ecef → #f2a7b8 → #f7ecef`, removing deep sakura and lantern.
- verification passed: targeted eslint, TypeScript, and `/` HTTP 200.

## footer svg logo

- [x] add the existing vima svg mark to the footer brand lockup
- [x] verify lint, TypeScript, and route response

### result

- footer brand lockup now renders the existing vima svg mark next to `v i m a.`.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and server-rendered footer lockup includes the svg and wordmark.

## footer resource declutter

- [x] remove footer links that only jump to sections already on the landing page
- [x] keep only hackathon-relevant resource links
- [x] loosen the footer resource grid so the chips are less cramped
- [x] verify lint, TypeScript, and route response

### result

- footer resource nav now only includes `devpost`, `source`, and `paper`.
- removed duplicate links for `demo`, `proof`, and `pipeline`.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and server-rendered footer href checks.

## serif landing headers

- [x] switch landing section headers to the existing serif stack
- [x] align evidence panel h3 typography with the same serif
- [x] verify targeted lint, TypeScript, and route response

### result

- changed the shared landing `HEADING_FONT` constant to `"Times New Roman", Times, serif`.
- changed evidence atlas panel h3 copy from Georgia fallback to the same Times stack.
- verification passed: targeted eslint, TypeScript, and `/` HTTP 200.

## hackathon footer links

- [x] add a devpost link to the footer
- [x] correct lucas and stephen github links
- [x] add hackathon-relevant resource links beyond static section nav
- [x] verify lint, typecheck, route response, and rendered link targets

### result

- added devpost, source, paper, proof, pipeline, and demo links to the compact footer.
- corrected builder github links for `stephenhungg` and `lucas-309`.
- verification passed: targeted eslint, TypeScript, `/`, `/demo`, and `/paper.pdf` HTTP 200; server-rendered footer includes the corrected hrefs.

## pipeline observer stepper

- [x] identify the right local surface for the GSAP Observer continuous-section pattern
- [x] add observer gestures to the pipeline stepper without hijacking document scroll
- [x] verify targeted lint, TypeScript, and route response

### result

- implemented the continuous-section observer idea inside `PipelineStepper`, where classify / anchor / settle already behave like a local story sequence.
- wheel, touch, and pointer gestures over the pipeline now advance or reverse the stepper with direction-aware panel motion.
- kept `preventDefault: false`, so normal page scroll is not hijacked.
- verification passed: targeted eslint, TypeScript, and `/` HTTP 200.

## react bits pro pipeline stepper

- [x] inspect the current pipeline section and React Bits Pro process components
- [x] choose `how-it-works-3` as the useful pattern for the pipeline
- [x] adapt it into a vima-native animated stepper instead of using the stock block styling
- [x] add restrained React Bits visual texture behind the pipeline
- [x] verify lint, typecheck, browser interaction, canvas rendering, and mobile overflow

### result

- replaced the boring three-cell pipeline grid with `components/landing/pipeline-stepper.tsx`.
- adapted the React Bits Pro `how-it-works-3` idea into a dark terminal stepper with classify, anchor, and settle states plus a shifting audit panel.
- layered in React Bits `Flicker` and `SquareMatrix` styling for subtle process texture without the stock white rounded-card look.
- verification passed: targeted eslint, TypeScript, desktop click state, mobile overflow `0`, no browser console errors, and canvas multi-point sampling found `133` nonblank samples.

## remove cursor and apply gsap observer

- [x] remove the landing custom cursor
- [x] inspect `/Users/stephenhung/Downloads/animated-continuous-sections-with-gsap-observer`
- [x] adapt the useful observer pattern without hijacking document scroll
- [x] verify targeted lint, TypeScript, route response, and cursor removal

### result

- removed the landing `VimaCursor` mount and deleted the generated React Bits custom cursor files.
- inspected the GSAP Observer demo; the whole fixed-section scroll-jack pattern is too heavy for vima, especially after reducing scroll weight.
- adapted only the useful part: `Observer` now lets the evidence atlas step through tabs on intentional wheel/swipe gestures over the atlas, with `preventDefault: false` so normal page scroll still works.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and static search found no remaining landing cursor imports/components.

## cursor ring and scroll weight

- [x] remove the visible cursor circle/ring
- [x] reduce landing page scroll smoothing weight
- [x] verify targeted lint, TypeScript, and local route response

### result

- changed the React Bits cursor wrapper to render only a tiny sakura dot: no outer ring, no target morphing.
- reduced `ScrollSmoother` from `smooth: 1.18` / `speed: 0.92` to `smooth: 0.58` / `speed: 1`.
- verification passed: targeted eslint, TypeScript, and `/` HTTP 200.

## ledger receipt redesign

- [x] identify why the ledger section felt pointless
- [x] redesign it as a settlement receipt instead of a bare table
- [x] verify lint, typecheck, route response, desktop render, and mobile overflow

### result

- replaced the bare “frame ledger” table with a settlement receipt layout.
- added a section-level claim, payout math strip, frame receipt rows, confidence/weight/status fields, and audit tail.
- made mobile receipt rows collapse into a compact two-line layout instead of forcing horizontal scroll.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop receipt visible, receipt row count `4`, and mobile overflow `0`.

## react bits gradient text headers

- [x] read the vima design system and taste rules before changing heading visuals
- [x] add the React Bits `GradientText` component as a local client component
- [x] use the yozakura palette for the animated gradient
- [x] apply the gradient treatment to the landing section headers
- [x] keep GSAP `SplitText` from stripping the gradient wrapper
- [x] verify lint, typecheck, served markup, browser console, and scroll reveal behavior

### result

- added `frontend/components/react-bits/gradient-text.tsx` and scoped css.
- applied the gradient to the evidence, pipeline, and final cta section headers.
- corrected the section heading font back to Saans so Times New Roman stays reserved for the `v i m a.` wordmark.
- verification passed: targeted eslint, TypeScript, served html includes the gradient text component, browser console had no hydration/runtime errors, and a chrome cdp wheel-scroll probe confirmed all 3 gradient headings stay mounted and reveal visible.

## gsap hero boot timeline

- [x] add dedicated `data-gsap-intro` hooks for nav, hero background, logo, copy, ctas, meta, and progress
- [x] make the loader emit a richer viewport-locked handoff event
- [x] replace the old hero-only reveal with a named gsap master intro timeline
- [x] make the metallic logo lockup responsive on mobile
- [x] verify targeted eslint, TypeScript, and desktop/mobile browser timing

### result

- implemented a coordinated first-load boot timeline in `ScrollMotion`: background/grid, nav, metallic mark, wordmark, copy, ctas, meta, and scroll progress now enter on named timeline labels after the loader handoff.
- removed the nav's first-load framer motion entrance so gsap owns the initial reveal while existing dropdown/menu interactions remain intact.
- kept the loader as the background aperture and changed its handoff to a `CustomEvent` with detail metadata; the loader now fades itself after the handoff so mobile cannot linger behind the intro.
- added a compact/mobile timeline timescale and responsive hero logo scaling so the first viewport does not overflow horizontally.
- follow-up: moved the first-load nav reveal to the final intro label and gave it a slower offscreen drop-in after the hero/meta lanes are already readable.
- verification passed: targeted eslint and TypeScript passed, and browser probes confirmed the nav stays hidden/offscreen until the final intro lane, lands visible after the hero/meta content, and has no desktop/mobile horizontal overflow.

## compact footer pass

- [x] shrink the footer from a full-screen section into a shorter organized band
- [x] reorganize footer content into brand, links/builders, and meta columns
- [x] verify lint, typecheck, route response, and responsive footer height/overflow

### result

- reduced the footer min-height, image band, bounce band, and panel padding.
- reorganized desktop into three columns: brand copy, nav/builders, and compact metadata.
- compacted mobile links/builders into two-column chip grids.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop footer height `638px`, mobile footer height `629px`, and no document-level horizontal overflow.

## landing cursor reticle

- [x] install the React Bits custom cursor component
- [x] scope it to the landing page only
- [x] gate it to fine-pointer desktop and no-preference motion users
- [x] verify lint, typecheck, and local route response

### result

- installed `components/react-bits/custom-cursor.tsx` from `@reactbits-starter/custom-cursor-tw`.
- added `components/landing/vima-cursor.tsx` as a restrained sakura reticle wrapper for the landing page only.
- cursor mounts only for fine-pointer hover devices with `prefers-reduced-motion: no-preference`, targets ctas/nav/evidence tabs/footer links, and stays below loader/menu layers.
- verification passed: TypeScript and `/` HTTP 200. targeted eslint had no new errors; it still reports existing `app/page.tsx` unused variable warnings and the generated react-bits file is ignored by the repo's eslint config.

## evidence atlas redesign

- [x] rethink the evidence tabs as an intentional proof atlas instead of a boxed widget
- [x] keep the Osmo-inspired GSAP Flip tab interaction
- [x] verify lint, typecheck, desktop render, tab switching, and mobile overflow

### result

- redesigned the evidence tab surface as an asymmetric proof atlas with a left checkpoint rail, central spine, and image-first evidence field.
- kept the Osmo-inspired GSAP Flip indicator and the animated content/image swap.
- removed the generic boxed component feel and tightened mobile behavior so the rail collapses into a compact two-column selector.
- fixed the current `lucide-react` `Github` import issue with a local inline mark so the route compiles.
- removed the heading `GradientText` wrappers that were causing hydration errors and restored serif section headers.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop tab switching, mobile tab switching, console clean, and mobile overflow `0`.

## footer link affordance and bounce

- [x] add a directional arrow affordance to the final cta button
- [x] make footer nav links feel clickable with matching svg icons and hover states
- [x] add builder github links to the footer
- [x] mount/fix the footer bounce animation
- [x] verify lint, typecheck, route response, and rendered footer behavior

### result

- added an arrow icon to the final `open dashboard` hex cta and a hover nudge.
- rebuilt footer nav links as bordered icon links with proof, ledger, pipeline, paper, and demo svgs.
- added a `built by` github link grid for the repo collaborators.
- mounted `FooterBounce` in `VimaFooter` and changed it from `MorphSVGPlugin` to a direct `attr.d` gsap tween so the path actually mutates.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and a chrome wheel-scroll probe confirmed the cta arrow, 5 icon footer links, 4 builder github links, mounted bounce layer, and 8 distinct bounce path states while entering the footer.

## remove motionpath flower

- [x] remove the decorative sakura flower follower from the landing scroll wrapper
- [x] remove unused MotionPathPlugin registration and refs
- [x] remove the now-unused sakura follower css
- [x] verify lint, typecheck, route response, and rendered dom cleanup

### result

- removed the fixed svg flower/motion-path layer from `ScrollMotion`.
- kept the scroll progress bar and ScrollSmoother behavior intact.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, static search found no remaining sakura/motionpath code in the component/css, and a chrome cdp probe confirmed zero flower/path nodes in the rendered dom.

## scroll-to-plugin anchor navigation

- [x] inspect the downloaded GreenSock `ScrollToPlugin` example
- [x] replace native anchor scrolling with gsap-powered scroll-to behavior
- [x] support the existing `ScrollSmoother` setup without breaking hash links
- [x] verify lint, typecheck, and browser click behavior

### result

- adapted the CodePen pattern from `scrolltoplugin-scroll-to-element/src/script.js`.
- registered `ScrollToPlugin` in the landing nav and scroll wrapper.
- nav buttons, dropdown links, mobile links, footer links, and section divider hash links now use the same smooth scroll-to behavior.
- because vima uses `ScrollSmoother`, the implementation drives `ScrollSmoother` when present and falls back to `gsap.to(window, { scrollTo })` otherwise.
- verification passed: targeted eslint, TypeScript, and a browser click test moved from `scrollY: 0` to `scrollY: 734` with `#evidence` aligned around `92px` from the viewport top.

## evidence image tabs

- [x] move the tabbed image interaction into the evidence chain section
- [x] restore pipeline to a simple three-step flow
- [x] verify lint, typecheck, route response, image tab switching, and mobile overflow

### result

- added `components/landing/evidence-image-tabs.tsx` as the evidence chain tab/image interaction.
- moved the GSAP Flip tab indicator and image/content swap into the evidence section below the stats ribbon.
- restored the pipeline section to a static classify / anchor / settle flow.
- deleted the old unused pipeline tab component and its stale css.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop tab switching, mobile tab switching, no console errors, and mobile overflow `0`.

## osmo gsap pipeline tabs

- [x] inspect `/Users/stephenhung/Downloads/interactive-tab-system-with-gsap-osmo`
- [x] adapt the Flip tab indicator and content swap into vima's pipeline section
- [x] verify lint, typecheck, route response, desktop tab switching, and mobile overflow

### result

- replaced the static pipeline cells with `components/landing/pipeline-tabs.tsx`.
- adapted the Osmo interaction pattern with local GSAP `Flip` and `CustomEase`, keeping the styling zero-radius and vima-native.
- added classify, anchor, and settle tab states with animated copy/visual swaps.
- removed the stale `pipeline-step` scroll animation target from `ScrollMotion`.
- fixed the generated `components/blocks/footer-2.tsx` lucide imports with inline svg icons so TypeScript is green again.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, browser tab switching for anchor and settle, and mobile overflow `0`.

## react bits footer-2 adaptation

- [x] install `@reactbits-pro/footer-2`
- [x] replace the footer-7 style with footer-2's image-band footer structure
- [x] remove the extra ghost wordmark/stats section below the footer
- [x] verify lint, typecheck, route response, and responsive footer render

### result

- installed `components/blocks/footer-2.tsx`.
- rebuilt `VimaFooter` as a footer-2-style image band with a dark centered content block, spaced navigation links, and compact metadata.
- removed the separate ghost wordmark and stats row that appeared below the footer.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop/mobile footer browser smoke checks, no extra footer sibling, and no horizontal overflow.

## motionpath sakura trace

- [x] read official MotionPathPlugin docs and local gsap plugin guidance
- [x] verify `gsap/MotionPathPlugin` is available in the installed package
- [x] add a restrained svg scroll-path follower to the landing page
- [x] verify lint, typecheck, route response, and browser scroll behavior

### result

- added a whole sakura-flower scroll follower to `ScrollMotion` using `MotionPathPlugin`.
- registered `MotionPathPlugin` with the existing GSAP plugin setup.
- mounted the flower layer in a fixed wrapper outside `#smooth-content`, so it stays viewport-pinned while `ScrollSmoother` transforms the page.
- tied the follower to document scroll using `start: 0`, `end: "max"`, and `scrub: 0.85`.
- hid the underlying svg motion path with transparent/0px stroke in both css and inline svg style; the path is scaffolding only.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and a chrome cdp probe confirmed the path is invisible, the flower moves on scroll, remains visible in the viewport, and no runtime/log errors appeared.

## react bits footer-7 adaptation

- [x] install `@reactbits-pro/footer-7`
- [x] inspect the generated block and map its structure onto vima's footer
- [x] adapt the footer to the dark lowercase design system
- [x] verify lint, typecheck, route response, and responsive footer render

### result

- installed `components/blocks/footer-7.tsx` and fixed its lucide imports so TypeScript compiles with this repo's icon version.
- rebuilt `VimaFooter` around footer-7's structure: brand mark + large wordmark, three large link columns, bottom meta/update row, stats row, and oversized ghost wordmark.
- kept `FooterBounce` behind the new footer and preserved lowercase/no all-caps styling.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop/mobile footer browser smoke checks, and no horizontal overflow.

## osmo-style loader adaptation

- [x] inspect `/Users/stephenhung/Downloads/willem-loading-animationosmo`
- [x] adapt the split-wordmark aperture reveal into vima's loader
- [x] verify lint, typecheck, and browser timing so the hero does not pop in all at once

### result

- inspected the Osmo/Willem loader and ported the core move: the wordmark rises in, splits around a narrow visual aperture, then the aperture expands into the full viewport.
- rebuilt `VimaLoader` around the `v i m a.` Times New Roman wordmark and reused the existing yozakura field inside the aperture.
- the loader now releases the hero timeline during the aperture expansion instead of waiting until after the overlay disappears, so the hero animates underneath the fade instead of popping in all at once.
- follow-up fix: viewport-locked the aperture imagery during expansion so the revealed sakura field stays aligned with the actual hero background instead of drifting as a local image inside the mask.
- verification passed: targeted eslint, TypeScript, and a Playwright timing probe at 0.5s/1.55s/2.75s/3.6s/4.85s confirmed the loader mounts, release fires, hero opacity ramps, and the loader unmounts.

## scroll flicker fix

- [x] read design rules, gsap scrolltrigger/plugin guidance, and current scroll motion code
- [x] identify visible-to-hidden `fromTo()` reveal flicker during scroll
- [x] pre-initialize reveal states and remove unstable title re-splitting
- [x] verify lint, typecheck, route response, and browser scroll behavior

### result

- fixed the flicker root cause in `ScrollMotion`: scroll reveal elements were visible in normal layout, then `fromTo()` was setting them back to `autoAlpha: 0` on enter.
- pre-initialized each reveal target once during setup, then changed the triggers to animate only toward visible state.
- made section divider rails static so they stop blinking at viewport edges.
- disabled `SplitText` auto re-splitting for section titles; titles now split once after fonts are ready and animate stable line masks.
- removed `data-gsap="section-copy"` from the pipeline dashboard link so it does not sit invisible at the bottom of the viewport.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and a chrome scroll probe found no hidden gsap reveal elements or invisible split lines in the viewport after scrolling.

## masked splittext header animation

- [x] inspect `/Users/stephenhung/Downloads/masked-lines-with-splittext`
- [x] port the masked line reveal into the landing GSAP wrapper
- [x] verify compile, lint, route response, and rendered split lines

### result

- added local GSAP `SplitText` masked-line reveals for `[data-gsap="section-title"]`.
- reused the existing `ScrollMotion` cleanup path with `gsap.context()`, `ScrollTrigger`, reduced-motion fallback, and split reversion.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and browser render found `8` split lines across `3` section titles.

## nav dropdown active-state pass

- [x] inspect current nav and landing section ids
- [x] add animated desktop hover dropdowns per nav item
- [x] add scroll-aware active section state in the nav
- [x] verify lint, typecheck, route response, and desktop/mobile behavior

### result

- replaced the first tiny preview popover with a real React Bits `navigation-2`-style expanding dropdown inside the nav container.
- added desktop hover dropdowns for proof, ledger, and pipeline using `AnimatePresence`, animated height, and staggered dropdown rows.
- added an `IntersectionObserver` in `VimaNavbar` so the nav boxes the active section while scrolling.
- mirrored active section state into the fullscreen/mobile menu links.
- fixed the landing heading font constant and kept the user-requested serif heading direction.
- installed `@reactbits-pro/navigation-2` into `components/blocks/navigation-2.tsx` for reference.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop hover dropdown grows the nav from 58px to 267px, dropdown lives inside the nav container, desktop ledger active state, and no horizontal overflow.

## footer bounce and loader restore

- [x] restore the landing loader on `/`
- [x] add scroll-speed svg bounce to the footer using the GreenSock reference
- [x] redesign the footer to better match `DESIGN.md`
- [x] verify lint, typecheck, route response, and browser render

### result

- restored `VimaLoader` on `/` so refresh shows the 2-second sakura orb loader again.
- added `components/landing/footer-bounce.tsx`, adapted from the GreenSock CodePen with `ScrollTrigger` and `MorphSVGPlugin`.
- rebuilt the footer into a quieter instrument grid with Saans labels, compact stats, better link treatment, and a dark sakura bounce wash behind it.
- verification passed: targeted eslint, TypeScript, served markup includes the loader and bounce svg, and a CDP browser scroll confirmed the loader exits and the footer morph path updates on scroll.

## section separation and heavy scroll pass

- [x] read `DESIGN.md`, taste skill, gsap scrolltrigger skill, and current landing motion code
- [x] make each major landing section occupy at least one viewport
- [x] add heavy wheel scrolling without snapping
- [x] verify lint, typecheck, route response, and browser scroll behavior

### result

- made hero, evidence, ledger, pipeline, final cta, and footer full-viewport scroll sections.
- kept divider rails between sections, but removed snap behavior entirely after user clarification.
- added desktop/fine-pointer heavy wheel scrolling in `ScrollMotion`: wheel deltas feed a damped scroll target so movement has mass without forcing section alignment.
- kept reduced-motion behavior intact and avoided forcing mobile/coarse-pointer scroll snapping.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and a chrome cdp wheel probe showing all six sections at full viewport height with post-wheel scroll not snapped to a section anchor.

## gsap scrollsmoother pass

- [x] read official ScrollSmoother docs and local gsap plugin guidance
- [x] verify `gsap/ScrollSmoother` is available in the installed package
- [x] replace custom wheel damping with official ScrollSmoother
- [x] verify lint, typecheck, route response, and browser scroll behavior

### result

- implemented the official `#smooth-wrapper` / `#smooth-content` structure in `ScrollMotion`.
- registered `ScrollSmoother` alongside `ScrollTrigger` and `SplitText`.
- moved fixed nav and loader outside the smoother wrapper so they stay fixed to the viewport.
- removed the custom wheel interception/damping code.
- configured smoother with `smooth: 1.18`, `speed: 0.92`, `effects: true`, and no touch smoothing.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and a chrome cdp probe confirmed the wrapper is fixed, the content gets transformed while scrolling, nav is outside the wrapper, all sections stay full viewport height, and scrolling does not snap to anchors.

## react bits nav bar pass

- [x] read `DESIGN.md`, taste skill, and React Bits Pro skill
- [x] inspect React Bits Pro navigation blocks from the local cache
- [x] adapt the best matching navigation pattern into a vima-native sticky header
- [x] wire the header into `/`
- [x] verify lint, typecheck, route response, and responsive render

### result

- inspected React Bits Pro `navigation-1` through `navigation-8` and the linked docs direction; final version follows the cleaner `navigation-6` top-nav/fullscreen-menu pattern more than the first boxed rail attempt.
- checked the starter React Bits catalog too; it has no literal nav component. removed the starter `FrameBorder` layer because it made the nav too busy and boxed-in.
- added `components/landing/vima-navbar.tsx` with fixed top nav, centered desktop anchors, demo/menu actions, and a fullscreen menu overlay with staggered links.
- wired the header into `/` and added responsive nav css.
- verification passed after restarting the stale Next dev server: targeted eslint, TypeScript, `/` HTTP 200, desktop/mobile Playwright smoke checks, mobile menu opens, and no horizontal overflow.

## loader mood/performance revision

- [x] inspect loading animations in sibling `flow` and `darwin` repos
- [x] replace flashy panel loader with a quieter mysterious orb/progress loader
- [x] verify targeted lint, typecheck, route response, and chrome render
- [ ] replace the custom riff with a direct flow-style loader copy
- [ ] verify the copied loader appears on refresh

### result

- studied `flow/frontend/src/components/LoadingScreen.tsx`, `flow/frontend/src/components/NoiseOrb.tsx`, `darwin/src/components/Loading.jsx`, and `darwin/src/components/LoaderOrb.jsx`.
- replaced the old panel/bars loader with a deterministic, low-motion black-room loader: faint sakura signal core, concentric rings, tiny drift petals, and one hairline progress reveal.
- removed the `window.load` dependency so video/assets cannot keep the overlay around and make the landing feel laggy.
- the exit now disables pointer events immediately before fading.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and headless Chrome render. full lint still has the known unrelated `src/hooks/use-api.ts` issue.

## react bits footer pass

- [x] inspect React Bits Pro footer templates from local cache
- [x] adapt the best matching footer structure into vima's landing page
- [x] verify lint, typecheck, route response, and browser screenshot

### result

- inspected React Bits Pro `footer-1` through `footer-6` from the local cache.
- adapted the bordered column grid from `footer-1` and the large brand/footer lockup idea from `footer-4` into a custom vima footer.
- added a `#footer` section divider plus footer links for proof, method, and submission.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and desktop/mobile browser screenshot smoke checks with no horizontal overflow.

## landing loading animation

- [x] read `DESIGN.md`, gsap guidance, and current landing motion code
- [x] add a gsap-powered loading overlay that matches the yozakura terminal direction
- [x] mount the loader on `/` without disrupting the existing scroll animations
- [x] verify lint, typecheck, and route response

### result

- added `components/landing/vima-loader.tsx`, a gsap-scoped loading overlay with a `v i m a.` wordmark, scanline, CII/SPL packet labels, confidence bars, reduced-motion fallback, and `ctx.revert()` cleanup.
- mounted it on `/` before the landing hero.
- added responsive grid rules for the loader packet row.
- verification passed: targeted eslint for touched tsx files, TypeScript, `/` HTTP 200, and Chrome headless after 2.5s showed the hero visible with the loader removed.
- note: full `bun run lint` still fails on the existing `src/hooks/use-api.ts` `react-hooks/set-state-in-effect` issue.

## react bits landing implementation

- [x] add `SimpleGraph` to the evidence section for the confidence stream
- [x] add `SquareMatrix` behind spatial zone attribution
- [x] verify targeted lint, typecheck, route response, and browser render

### result

- wired the existing React Bits `SimpleGraph` into the evidence section as a low-noise confidence trace.
- wired the existing React Bits `SquareMatrix` into the spatial zones panel as a restrained WebGL site-grid backdrop.
- added a WebGL capability fallback inside `SquareMatrix` so unsupported browsers/headless runs do not throw page errors.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, desktop/mobile browser screenshots, no mobile overflow, and nonblank matrix screenshot sampling.
- note: full `bun run lint` still fails on the pre-existing `frontend/src/hooks/use-api.ts` `react-hooks/set-state-in-effect` issue.

## react bits utilization map

- [x] read React Bits Pro skill instructions and local cache catalog
- [x] inventory starter components, pro blocks, and currently vendored components
- [x] map high-fit components onto the current single-page vima flow
- [x] identify components to avoid because they fight `DESIGN.md`

### result

- catalog available: 88 starter components and 108 pro blocks in `~/Downloads/output/reactbits-signal-lab/reactbits-registry-cache`.
- already vendored in vima: `silk-waves`, `square-matrix`, `simple-graph`, `frame-border`, `liquid-ascii`, `ascii-waves`, `halftone-wave`, `flicker`, `blur-highlight`, `3d-letter-swap`, `text-scatter`, `chroma-card`, `gradient-carousel`, `rotating-cards`, plus blocks `features-4`, `stats-3`, `social-proof-1`, `waitlist-1`.
- best fit now:
  - hero background: `silk-waves` or `flicker`, low opacity behind the existing yozakura video only if it improves depth.
  - telemetry rail: `simple-graph`, `flicker`, or `frame-border` as instrument micro-surfaces.
  - evidence ledger: `simple-graph` for wrench-time/confidence trend, `frame-border` for active frame focus.
  - spatial zones: `square-matrix` as a restrained grid field behind zone attribution.
  - pipeline: `retro-lines`, `perspective-grid`, or `rising-lines` from cache if we want a stronger scroll-section transition.
  - final cta: adapt `cta-1` or keep current `HexCta`; current custom cta is more on-brand.
- likely next installs from cache: `retro-lines-tw`, `perspective-grid-tw`, `rising-lines-tw`, `animated-list-tw`, `staggered-text-tw`, maybe `comparison-slider-tw`.
- avoid for this design unless the direction changes: cursor effects, glass cursor, bubble/pill nav blocks, ecommerce/auth/pricing/blog blocks, heavy card carousels, credit-card/payment-looking components, neon reveal, modal cards, cute gallery components.

## react bits pro skill install

- [x] locate the React Bits Pro skill in the local registry cache
- [x] install it into `~/.codex/skills/react-bits-pro`
- [x] verify vima already has React Bits Pro shadcn registries configured
- [x] verify the local registry cache and license setup are available

### result

- installed the skill from `~/Downloads/output/reactbits-signal-lab/reactbits-registry-cache/raw/starter/skills/SKILL.md`.
- added a local cache note to the installed skill so future sessions know where the authenticated registry dump lives.
- confirmed `frontend/components.json` has `@reactbits-starter` and `@reactbits-pro` registries configured.
- confirmed `frontend/.env.local` contains `REACTBITS_LICENSE_KEY` without printing the secret.

## reference component steal pass

- [x] inspect reusable components from opal, iris, and bip
- [x] adapt the best-fitting component pattern into vima without breaking design rules
- [x] wire the adapted component into the single-page landing flow
- [x] verify lint and typecheck

### result

- adapted opal's live telemetry/feed pattern into `components/landing/vima-telemetry-feed.tsx`.
- added a vima-native rail with typewritten capture log, CII waveform, zone packet, and settlement snapshot.
- wired the rail into `/` between the hero and evidence sections.
- skipped the card-swap/pill-nav style components because they fight the current zero-radius instrument direction.
- verification passed: targeted eslint, TypeScript, and `/` HTTP 200.

## hex cta pass

- [x] add a reusable landing cta that uses the existing hex motif
- [x] place the new cta in the final section before the footer area
- [x] verify lint/typecheck and document the result
- [x] upgrade final cta background to use the hexagonal WebGL shader component

### result

- added `HexCta` as a reusable landing CTA with animated hex cells, rotating hex outlines, a subtle scan sweep, magnetic hover support, and reduced-motion fallback.
- placed the CTA in the final `#cta` section before the footer area, pointing to `/demo`.
- restored the hero CTA cluster to the prior simple button treatment after clarifying placement.
- upgraded the final CTA panel to use `HeroShader` as the WebGL hex-tiled background layer, with a dark sakura wash to preserve readability.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and headless Chrome screenshot smoke checks.

## single-page scroll landing pass

- [x] review reference page structure from opal, iris, and bip
- [x] move evidence content into `/` as scroll sections
- [x] update landing ctas/nav anchors so the primary flow stays on one page
- [x] add scroll-aware GSAP reveals with reduced-motion cleanup
- [x] purge the separate evidence route and old route-scoped motion wrapper
- [x] verify lint, typecheck, and route response

### result

- `/` is now the single scroll landing page: hero, evidence chain, frame ledger, spatial zones, pipeline, and settlement preview all live in one flow.
- removed the separate evidence route files, route-scoped motion wrapper, and stale unused `LandingGsap` wrapper.
- primary cta now anchors to `#evidence`; `/demo` remains the live dashboard.
- added `components/landing/scroll-motion.tsx` with GSAP boot-in, ScrollTrigger reveals, scanline sweep, ledger pulse, active stat drift, magnetic ctas, and reduced-motion handling.
- verification passed: targeted eslint, TypeScript, `/` HTTP 200, and `/evidence` HTTP 404 after purge.

## gsap evidence animation pass

- [x] add a scoped client-only gsap motion wrapper
- [x] mark evidence page elements for timeline sequencing
- [x] add reduced-motion and cleanup-safe animation behavior
- [x] verify lint, typecheck, and route response

### result

- superseded by the single-page scroll landing pass.
- added subtle persistent motion: scanline sweep, active wrench-time drift, ledger row pulse, and a small magnetic dashboard cta on fine pointers.
- verification passed: targeted eslint, TypeScript, and `/evidence` HTTP 200 on the existing dev server.

## next landing page pass

- [x] define the next page scope from current app routes and design rules
- [x] add a yozakura-terminal evidence page as the next landing route
- [x] link the landing hero to the new page without disrupting `/demo`
- [x] run frontend verification
- [x] document result

### result

- superseded by the single-page scroll landing pass.
- note: full `bun run lint` still fails on the existing `src/hooks/use-api.ts` `react-hooks/set-state-in-effect` issue.

- [x] read current `DESIGN.md`, landing page, logo implementation, and session lessons
- [x] identify contradictions after recent typography and lorem-placeholder decisions
- [x] update `DESIGN.md` to match the actual current landing direction
- [x] fix stale code comments that contradict the design system
- [x] verify docs and frontend checks

## gstack review report

- updated `DESIGN.md` to match the current landing direction: sparse hero-first page, lorem placeholders allowed during visual tuning, `v i m a.` as the only Times New Roman usage, and Saans/Saans Mono everywhere else.
- corrected stale logo comments so the implementation no longer claims the wordmark is Saans.
- verification passed with targeted eslint and TypeScript checks.

## japanese nocturne redesign session

- [ ] research dark japanese / sakura / pink visual references
- [x] translate references into a focused direction for vima
- [x] refactor active landing brand to `vima` / `v i m a.`
- [ ] update `DESIGN.md` with new aesthetic, type, color, layout, and anti-pattern rules
- [ ] verify the updated design doc has no contradictions

## veo background asset pass

- [x] install the gsap skills repo for future motion work
- [x] crop the veo clip to remove baked side bars and strip audio
- [x] create a looping gif preview for comparison
- [x] wire the optimized video asset into the landing background with the existing svg/css art as fallback
- [x] verify lint/type checks for the touched frontend files

### result

- installed the GreenSock gsap skills into `/Users/stephenhung/.codex/skills/`.
- kept the gif as a comparison artifact only because it is 16mb even at 960px / 12fps.
- wired the cleaned mp4/webm background into the landing page; the original svg/css yozakura art remains as fallback.
- verification passed: targeted eslint, TypeScript, asset serving checks, and a Chrome headless screenshot.

## gsap landing motion pass

- [x] read installed gsap skill guidance
- [x] add scoped gsap setup with cleanup and reduced-motion handling
- [x] add landing hero reveal targets without changing copy or layout direction
- [x] verify lint/type checks

### result

- used the installed gsap guidance on the current `ScrollMotion` component instead of adding a competing wrapper.
- kept `gsap.context()` + `gsap.matchMedia()` cleanup, reduced-motion handling, scroll batches, scanline, active-row pulse, and magnetic CTA behavior.
- fixed hero `from()` tweens with `immediateRender: false` so content remains visible if a browser/headless run does not tick the timeline immediately.
- added a subtle gsap background scale breath on `YozakuraBackground` using transform-only animation.

## hero background fade pass

- [x] keep the yozakura video background on the hero only
- [x] move the blossom/video layer into the hero with a bottom fade mask
- [x] add section fragment dividers for deep-link routing
- [x] verify lint/type checks and scroll behavior

### result

- hero video now lives inside `#top` instead of a fixed global background, with a bottom mask so it fades into black before the next section.
- evidence and later sections no longer have the blossom/video layer behind them.
- added fragment divider links for `#evidence`, `#ledger`, `#pipeline`, and `#cta`.
- verification passed: targeted eslint, TypeScript, and headless browser checks for video visibility, evidence scroll state, and `/#pipeline` deep linking.

## landing declutter pass

- [x] remove competing decorative surfaces after the hero
- [x] simplify evidence to a headline and four core stats
- [x] simplify ledger to one quiet table
- [x] simplify pipeline from six cards to three sparse steps
- [x] replace the shader/hex cta and oversized footer with quiet text/button surfaces
- [x] verify lint, typecheck, and browser hash navigation

### result

- removed the loader, telemetry rail, confidence graph, square-matrix zone panel, shader cta, hex cta, and large footer grid from the landing flow.
- kept the hero video/wordmark, `#evidence`, `#ledger`, `#pipeline`, `#cta`, and dashboard/paper links.
- verification passed: targeted eslint, TypeScript, and headless screenshots for top and `/#ledger`.

## gsap choreography pass

- [x] read the gsap timeline/core/react skill guidance
- [x] replace generic fade/y entrances with named hero timeline choreography
- [x] add section-specific gsap targets for stats, ledger rows, pipeline steps, and cta actions
- [x] remove the loader overlay so the landing timeline is actually visible first
- [x] verify lint, typecheck, and browser screenshots

### result

- rebuilt `ScrollMotion` around a labeled hero timeline instead of one generic fade stack.
- hero now layers background scale-in, eyebrow wipe, logo 3D drop/tilt, lateral copy reveals, opposing CTA slides, and meta line expansion.
- scroll sections now have distinct motion: divider line sweep, title clip reveal, stats from edge-staggered cells, ledger panel wipe, alternating ledger row slides, pipeline 3D step entrance, and cta panel/action entrance.
- removed the landing loader overlay so the page choreography is visible immediately.
- verification passed: targeted eslint, TypeScript, and browser screenshots for top, `/#ledger`, and `/#pipeline`.

## gsap pop-in fix

- [x] identify why the landing stayed on the vima shader before the hero appeared
- [x] remove the loader overlay from `/`
- [x] move gsap initialization to layout timing
- [x] set hero initial states explicitly before playing the intro timeline
- [x] remove the scroll snap trigger that could create stuck/jump behavior
- [x] verify lint, typecheck, and browser state

### result

- root cause was `VimaLoader`: it held a noise-orb vima shader for a minimum of 2 seconds, hiding the actual hero timeline.
- `ScrollMotion` now uses `useLayoutEffect`, explicitly sets the hero start state, then plays the intro timeline with `.to()` steps.
- removed the weighted section scroll snap trigger because it could make dev scrolling feel sticky.
- verification passed: no `VimaLoader` on the landing path, targeted eslint, TypeScript, and browser checks with no console errors.

## loader image sequence

- [x] copy the three generated loader frames into frontend public assets
- [x] wire the loader aperture to sequence through the frames
- [x] preserve the existing final aperture expansion handoff
- [x] verify lint, TypeScript, media responses, and browser loader playback

### result

- copied the three generated frames into `frontend/public` as `vima-loader-signal.png`, `vima-loader-rebar.png`, and `vima-loader-site.png`.
- updated the loader aperture to crossfade through signal → rebar → site, then expand the site frame with the existing viewport-locked handoff.
- verification passed: targeted eslint, TypeScript, all three loader image routes return 200, browser timing shows the site frame at reveal, and mobile overflow is 0.

## loader osmo reference fix

- [x] inspect the willem/osmo loading animation reference structure
- [x] identify why the current loader image handoff is not behaving properly
- [x] patch the vima loader to use the correct mask/image pattern
- [x] verify lint, TypeScript, asset serving, desktop/mobile browser behavior

### result

- inspected the osmo/willem reference and matched its key structure: a small center box, a nested growing image mask, stacked cover images, instant cover fade-outs, then final image expansion.
- fixed the current loader bug where the hidden middle cover faded before the visible top cover, which made the image sequence feel wrong.
- verification passed: targeted eslint, TypeScript, image routes 200, desktop timing shows final image expands to viewport before release, and mobile exits with no horizontal overflow.

## vima documentation rebrand

- [x] scan allowed root docs/tasks markdown for legacy brand references
- [x] update brand-facing references to vima / `v i m a.`
- [x] verify remaining references are intentional technical paths or identifiers
- [x] document changed files and intentional leftovers

### result

- updated root/project docs, docs content, and task notes to use the vima brand in user-facing prose.
- left existing repo urls, local paths, source filenames, component names, and CSS identifiers alone where changing the docs would make them lie about the current tree.

## loader final background switch

- [x] identify the actual hero background poster used by `YozakuraBackground`
- [x] add it as the final base frame after the three generated loader frames
- [x] verify timing shows signal → rebar → site → hero poster before expansion

### result

- loader now switches through signal → rebar → site → the actual hero poster before expanding.
- browser timing confirmed each frame becomes the visible top layer before release.

## existing section atmospheres

- [x] apply the loader/generated visual language to existing landing sections
- [x] avoid adding any new page sections or conceptual content blocks
- [x] verify the atmospheres are mounted on the real section ids

### result

- evidence, ledger, pipeline, stack, and cta now use the generated/hero imagery as subtle section backplates.
- verification confirmed the existing section ids have atmospheres and desktop overflow remains 0.

## loader full-bleed video handoff

- [x] replace the final loader poster layer with the actual hero video source
- [x] expand the loader mask width and height past the viewport before release
- [x] verify desktop growth reaches full-bleed dimensions and mobile exits without overflow

### result

- the final loader layer is now `/vima-yozakura-loop.mp4` with the same poster and object positioning as the hero background.
- the mask now grows to `112vw` by `112dvh` before firing the hero release, removing the letterbox/bar handoff.
- verification passed: targeted eslint, TypeScript, video route 200, desktop mask reaches roughly `1610x1118` on a `1440x1000` viewport, and mobile overflow remains 0.

## loader actual-background reveal fix

- [x] remove the duplicate hero video from the loader aperture
- [x] keep the actual hero background visible from frame zero
- [x] verify the transparent aperture reveals the mounted hero video underneath

### result

- the loader no longer renders its own video element.
- `intro-bg` is visible immediately, so the page's real `YozakuraBackground` video is loaded and playing behind the loader.
- browser verification confirms: loader video count `0`, hero video count `1`, hero bg opacity `1`, hero video playing before release, and overflow remains 0.

## loader real backdrop framing fix

- [x] inspect the actual hero poster to find the visible blossom/detail region
- [x] move the shared fixed backdrop under the loader and hero so both reveal the same layer
- [x] replace the loader scrim panel/ticker approach with an osmo-style aperture shadow
- [x] use GSAP to start the backdrop zoomed/panned into the flower detail and animate it back during aperture expansion
- [x] verify the transparent phase reveals visible background pixels, not black

### result

- the loader now reveals the actual fixed `YozakuraBackground`, not a duplicate video and not a black page base.
- the backdrop starts at `scale 1.58`, panned into the top/right blossom detail, then GSAP animates it to normal framing during the aperture expansion.
- removed the laggier four-panel scrim/ticker implementation; the aperture uses a large outside shadow instead.
- verification passed: targeted eslint, TypeScript, desktop pixel probe at the previous failure moment is now `nonBlackRatio 0.996`, hero video is playing, and mobile overflow remains 0.

## loader aperture edge leak fix

- [x] keep the aperture opaque while generated frames are cycling
- [x] bleed loader images under the aperture border so no background peeks through sub-pixel edges
- [x] only fade the generated frames and aperture fill when the real backdrop reveal starts
- [x] ensure other routes render above any landing backdrop residue
- [x] verify loader phase, reveal phase, and `/demo` background behavior

### result

- aperture now starts with `#080503` fill and only animates to transparent during the expansion beat.
- loader frame layers use `inset: -2px`, so the images cover under the drawn border.
- the site frame stays as the base image until the real backdrop reveal begins.
- global `body > main` z-index keeps non-landing pages above any fixed landing backdrop during navigation.
- verification passed: targeted eslint, TypeScript, visual pixel probe, and `/demo` has no landing backdrop with black main background.
