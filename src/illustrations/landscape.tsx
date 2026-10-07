import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

const Tree = ({ x, y, s = 1, c = '#2F8F4E' }: { x: number; y: number; s?: number; c?: string }) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Rect x={-2} y={0} width={4} height={10} fill="#7A5232" />
    <Polygon points="0,-34 -13,-6 13,-6" fill={c} />
    <Polygon points="0,-24 -16,4 16,4" fill={c} />
  </G>
);

const Blossom = ({ x, y, r = 10 }: { x: number; y: number; r?: number }) => (
  <G>
    <Rect x={x - 1.5} y={y} width={3} height={r * 1.2} fill="#8A5A3B" />
    <Circle cx={x} cy={y} r={r} fill="#F7B8CF" />
    <Circle cx={x - r * 0.6} cy={y + r * 0.3} r={r * 0.7} fill="#F4A3C0" />
    <Circle cx={x + r * 0.6} cy={y + r * 0.2} r={r * 0.7} fill="#F9CADB" />
  </G>
);

/** Calm valley — the welcome hero. */
export function Landscape({ height = 320 }: { height?: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 360 320" preserveAspectRatio="xMidYMax slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#DCEFF5" />
          <Stop offset="1" stopColor="#FCEBDD" />
        </LinearGradient>
        <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFC58A" />
          <Stop offset="1" stopColor="#FF9E6B" />
        </LinearGradient>
        <LinearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9BD38B" />
          <Stop offset="1" stopColor="#6DBB6A" />
        </LinearGradient>
        <LinearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7CC56F" />
          <Stop offset="1" stopColor="#4FA45A" />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="320" fill="url(#sky)" />
      <Circle cx="270" cy="120" r="34" fill="url(#sun)" opacity={0.9} />
      {/* far mountains */}
      <Path d="M-10 190 L70 80 L120 140 L170 60 L250 170 L300 120 L380 200 L380 230 L-10 230 Z" fill="#9FB7C9" />
      <Path d="M70 80 L58 98 L70 94 L80 104 L86 101 Z M170 60 L156 80 L170 74 L182 86 L190 82 Z" fill="#FFFFFF" />
      <Path d="M-10 210 L60 150 L130 200 L210 130 L290 190 L380 160 L380 250 L-10 250 Z" fill="#7FA3B5" opacity={0.7} />
      {/* hills */}
      <Path d="M-10 230 Q80 180 180 220 T380 210 L380 320 L-10 320 Z" fill="url(#hillBack)" />
      <Path d="M-10 260 Q100 220 200 255 T380 250 L380 320 L-10 320 Z" fill="url(#hillFront)" />
      {/* winding path */}
      <Path d="M150 320 C150 290 220 285 205 262 C195 247 160 250 175 236" stroke="#F3D9A8" strokeWidth={14} fill="none" strokeLinecap="round" />
      {/* house */}
      <G transform="translate(176 206)">
        <Rect x={0} y={10} width={30} height={22} fill="#FFF4E6" />
        <Polygon points="-4,12 15,-4 34,12" fill="#C2553F" />
        <Rect x={11} y={20} width={8} height={12} fill="#8A5A3B" />
        <Rect x={3} y={15} width={6} height={6} fill="#9BD3F2" />
      </G>
      {/* trees */}
      <Tree x={40} y={238} s={1.1} />
      <Tree x={70} y={248} s={0.9} c="#3B9C55" />
      <Tree x={110} y={236} s={0.8} />
      <Tree x={250} y={232} s={0.9} c="#3B9C55" />
      <Tree x={290} y={242} s={1.2} />
      <Tree x={330} y={236} s={0.9} />
      <Tree x={20} y={290} s={1.3} c="#2A7F45" />
      <Tree x={330} y={296} s={1.3} c="#2A7F45" />
      <Blossom x={95} y={278} r={12} />
      <Blossom x={268} y={282} r={11} />
      <Ellipse cx="230" cy="300" rx="10" ry="5" fill="#FFFFFF" opacity={0.6} />
    </Svg>
  );
}
