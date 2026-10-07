import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

const Roof = ({ y, w }: { y: number; w: number }) => (
  <Path d={`M${-w / 2} ${y} Q0 ${y - 16} ${w / 2} ${y} L${w / 2 - 6} ${y + 4} L${-w / 2 + 6} ${y + 4} Z`} fill="#3A2A2A" />
);

/** Mt. Fuji + pagoda + sakura — the Japan Trip goal hero. */
export function JapanArt({ height = 160 }: { height?: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="jsky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#BFDDF2" />
          <Stop offset="1" stopColor="#FBE3EA" />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="200" fill="url(#jsky)" />
      <Path d="M40 170 L150 60 Q160 52 170 60 L280 170 Z" fill="#7E9CC0" />
      <Path d="M150 60 Q160 52 170 60 L196 86 L184 82 L176 92 L164 82 L152 92 L142 82 L126 86 Z" fill="#FFFFFF" />
      <Path d="M-10 175 Q90 150 180 170 T370 165 L370 200 L-10 200 Z" fill="#E9C9D6" />
      {/* pagoda */}
      <G transform="translate(268 60)">
        <Rect x={-14} y={10} width={28} height={110} fill="#D6453D" />
        <Roof y={14} w={56} />
        <Rect x={-16} y={36} width={32} height={4} fill="#F2C14E" />
        <Roof y={44} w={70} />
        <Roof y={76} w={84} />
        <Roof y={108} w={98} />
        <Rect x={-2} y={-12} width={4} height={24} fill="#3A2A2A" />
      </G>
      {/* sakura */}
      {[
        [30, 70, 26], [70, 50, 22], [10, 120, 24], [330, 30, 20], [345, 110, 26],
      ].map(([x, y, r], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r={r} fill="#F6B3CA" />
          <Circle cx={x + r * 0.5} cy={y + r * 0.3} r={r * 0.7} fill="#F9CCDC" />
          <Circle cx={x - r * 0.4} cy={y + r * 0.4} r={r * 0.6} fill="#EF9CB9" />
        </G>
      ))}
      <Polygon points="0,200 0,150 40,200" fill="#F0B4C8" />
    </Svg>
  );
}
