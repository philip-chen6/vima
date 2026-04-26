import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

type HexCtaProps = {
  href: string;
  label: string;
  detail: string;
  metric?: string;
  external?: boolean;
};

const hexCells = [
  [42, 21],
  [60, 31],
  [60, 52],
  [42, 62],
  [24, 52],
  [24, 31],
  [42, 42],
] as const;

function HexSignal() {
  return (
    <span className="hex-cta-signal" aria-hidden="true">
      <svg className="hex-cta-svg" viewBox="0 0 84 84" role="presentation">
        <defs>
          <path
            id="hex-cta-cell"
            d="M 0 -10 L 8.66 -5 L 8.66 5 L 0 10 L -8.66 5 L -8.66 -5 Z"
          />
        </defs>
        <g className="hex-cta-grid">
          {hexCells.map(([x, y], index) => (
            <use
              key={`${x}-${y}`}
              href="#hex-cta-cell"
              x={x}
              y={y}
              style={{ "--hex-index": index } as CSSProperties}
            />
          ))}
        </g>
        <path className="hex-cta-frame" d="M42 8 71.44 25v34L42 76 12.56 59V25Z" />
        <path className="hex-cta-core" d="M42 25 56.72 33.5v17L42 59 27.28 50.5v-17Z" />
      </svg>
    </span>
  );
}

export default function HexCta({ href, label, detail, metric, external = false }: HexCtaProps) {
  const className = metric ? "hex-cta hex-cta--with-metric" : "hex-cta";
  const content = (
    <>
      <span className="hex-cta-copy">
        <span className="hex-cta-label">
          {label}
          <ArrowRight aria-hidden="true" size={15} strokeWidth={1.8} />
        </span>
        <span className="hex-cta-detail">{detail}</span>
      </span>
      {metric ? <span className="hex-cta-metric">{metric}</span> : null}
      <HexSignal />
    </>
  );

  if (external) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer" data-gsap-magnetic>
        {content}
      </a>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a className={className} href={href} data-gsap-magnetic>
        {content}
      </a>
    );
  }

  return (
    <Link className={className} href={href} data-gsap-magnetic>
      {content}
    </Link>
  );
}
