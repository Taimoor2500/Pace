import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/** Seedling growing from a mound of coins — the monthly-review peak moment. */
export function Sprout({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Ellipse cx="100" cy="176" rx="70" ry="10" fill="#0E1116" opacity={0.06} />
      <Path d="M36 170 Q100 112 164 170 Z" fill="#9A6B45" />
      <Path d="M50 168 Q100 126 150 168 Z" fill="#B88458" />
      {/* coins */}
      {[[60, 162], [140, 160], [124, 168]].map(([x, y], i) => (
        <G key={i}>
          <Ellipse cx={x} cy={y} rx="14" ry="6" fill="#E9A923" />
          <Ellipse cx={x} cy={y - 3} rx="14" ry="6" fill="#F7C548" />
        </G>
      ))}
      {/* stem + leaves */}
      <Path d="M100 140 Q98 110 102 80" stroke="#3E9B4F" strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d="M102 92 Q60 90 50 56 Q92 50 102 92 Z" fill="#5DBB63" />
      <Path d="M102 92 Q72 80 50 56" stroke="#3E9B4F" strokeWidth={2} fill="none" />
      <Path d="M101 82 Q140 76 156 40 Q112 38 101 82 Z" fill="#79CF6E" />
      <Path d="M101 82 Q130 66 156 40" stroke="#3E9B4F" strokeWidth={2} fill="none" />
      {/* sparkles */}
      <Path d="M40 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#F7C548" />
      <Path d="M170 80 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z" fill="#F7C548" />
      <Circle cx="160" cy="24" r="4" fill="#8B5CF6" opacity={0.6} />
      <Circle cx="28" cy="96" r="3" fill="#E8487F" opacity={0.6} />
      <Rect x="176" y="120" width="6" height="6" rx="1" fill="#3B7BF6" opacity={0.5} transform="rotate(20 179 123)" />
    </Svg>
  );
}
