import classes from "./management-home.module.css";

const kelp = [
  { x: 70, height: 96, delay: 0 },
  { x: 96, height: 64, delay: -1.6 },
  { x: 610, height: 82, delay: -0.8 },
  { x: 636, height: 118, delay: -2.4 },
  { x: 662, height: 70, delay: -1.2 },
  { x: 1150, height: 104, delay: -0.4 },
  { x: 1174, height: 72, delay: -2 },
];

export const Seabed = () => (
  <svg className={classes.seabed} viewBox="0 0 1200 160" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
    <path
      className={classes.seabedBack}
      d="M0 160V120c80-10 140 8 220-2s140 6 240-2 180 6 300-4 180 8 280-2 120 4 160-2v50Z"
    />
    {kelp.map((strand) => (
      <path
        key={strand.x}
        className={classes.kelp}
        style={{ animationDelay: `${strand.delay}s`, transformOrigin: `${strand.x}px 150px` }}
        d={`M${strand.x} 150C${strand.x - 10} ${150 - strand.height * 0.35} ${strand.x + 10} ${150 - strand.height * 0.65} ${strand.x} ${150 - strand.height}`}
      />
    ))}
    <path
      className={classes.seabedFront}
      d="M0 160v-18c120-6 240 4 380-2s220 6 340-2c60-18 120-22 180-14 60-18 140-20 200-4 50-4 80 4 100 2v38Z"
    />
  </svg>
);
