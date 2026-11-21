import {
  Activity,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  MousePointer2,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

const data = {
  "7 days": {
    revenue: "$12,840",
    visitors: "8,204",
    conversion: "3.84%",
    gains: ["8.6%", "6.1%", "0.3%"],
    values: [18, 22, 21, 30, 28, 34, 39],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    sources: [52, 31, 17],
    ceiling: "$4k",
  },
  "30 days": {
    revenue: "$48,620",
    visitors: "32,418",
    conversion: "4.12%",
    gains: ["12.8%", "9.4%", "0.6%"],
    values: [
      12, 17, 15, 21, 18, 23, 22, 27, 20, 26, 25, 31, 27, 35, 32, 41, 38, 44,
    ],
    labels: ["Day 1", "Day 7", "Day 14", "Day 21", "Day 30"],
    sources: [48, 34, 18],
    ceiling: "$5k",
  },
  "90 days": {
    revenue: "$136,750",
    visitors: "94,602",
    conversion: "3.97%",
    gains: ["16.3%", "13.2%", "0.4%"],
    values: [8, 14, 12, 19, 17, 25, 22, 30, 26, 34, 29, 37, 36, 43],
    labels: ["Day 1", "Day 30", "Day 60", "Day 90"],
    sources: [44, 36, 20],
    ceiling: "$6k",
  },
};
type Period = keyof typeof data;
const sourceNames = ["Organic search", "Direct", "Referral"];

function RevenueChart({ period }: { period: Period }) {
  const { values, labels, ceiling } = data[period];
  const points = values.map((value, index) => [
    (index * 1000) / (values.length - 1),
    120 - value * 2.4,
  ]);
  const line = points
    .map(
      ([x, y], index) =>
        (index === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1),
    )
    .join(" ");
  return (
    <figure className="plot">
      <figcaption className="visually-hidden">
        Revenue trend for the last {period}
      </figcaption>
      <div className="axes">
        <span>{ceiling}</span>
        <span>$0</span>
      </div>
      <div className="chart-content">
        <svg
          viewBox="0 0 1000 126"
          preserveAspectRatio="none"
          role="img"
          aria-label={"Revenue increased over the last " + period}
        >
          <defs>
            <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d4f491" stopOpacity=".3" />
              <stop offset="100%" stopColor="#d4f491" stopOpacity=".02" />
            </linearGradient>
          </defs>
          {[0, 40, 80, 120].map((y) => (
            <line
              key={y}
              x1="0"
              x2="1000"
              y1={y + 1}
              y2={y + 1}
              stroke="#383b39"
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={line + " L1000 122 L0 122 Z"} fill="url(#fill)" />
          <path
            d={line}
            fill="none"
            stroke="#d6f696"
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="ticks">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </figure>
  );
}

export default function App() {
  const [period, setPeriod] = useState<Period>("30 days");
  const selected = data[period];
  const metrics = [
    { title: "Revenue", value: selected.revenue, Icon: CircleDollarSign },
    { title: "Visitors", value: selected.visitors, Icon: UsersRound },
    { title: "Conversion", value: selected.conversion, Icon: MousePointer2 },
  ];
  return (
    <div className="pulse">
      <header className="mast">
        <div className="brand">
          <span>
            <Activity size={22} strokeWidth={2.4} />
          </span>
          Pulse
        </div>
        <div className="workspace">Workspace analytics</div>
        <span className="account" aria-label="Alex Ellis">
          AE
        </span>
      </header>
      <main>
        <div className="heading">
          <div>
            <div className="crumb">
              <ChartNoAxesColumnIncreasing size={13} /> Performance
            </div>
            <h1>Overview</h1>
          </div>
          <div className="periods" role="group" aria-label="Date range">
            {(Object.keys(data) as Period[]).map((option) => (
              <button
                aria-pressed={option === period}
                key={option}
                onClick={() => setPeriod(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <section className="metrics" aria-label="Key metrics">
          {metrics.map(({ title, value, Icon }, i) => (
            <article key={title}>
              <div className="metric-name">
                <Icon size={14} />
                {title}
              </div>
              <div className="metric-row">
                <strong>{value}</strong>
                <span aria-label={"Up " + selected.gains[i]}>
                  <ArrowUpRight size={11} />
                  {selected.gains[i]}
                </span>
              </div>
            </article>
          ))}
        </section>
        <div className="charts">
          <section className="panel">
            <div className="panel-title">
              <h2>Revenue trend</h2>
              <span className="legend">
                <i />
                Revenue
              </span>
            </div>
            <RevenueChart period={period} />
          </section>
          <section className="panel channels">
            <h2>Traffic sources</h2>
            <div className="source-list">
              {sourceNames.map((name, i) => (
                <div className="source" key={name}>
                  <div>
                    <span>{name}</span>
                    <strong>{selected.sources[i]}%</strong>
                  </div>
                  <div className="track">
                    <i style={{ width: selected.sources[i] + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
