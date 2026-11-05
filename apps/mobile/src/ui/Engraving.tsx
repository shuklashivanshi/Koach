import Svg, { Line, Path, Rect } from 'react-native-svg';
import { useTheme } from './useTheme';

/** Sepia line engraving: an arched window with falling light (UI_SPEC §8). */
export function WindowEngraving({ size = 120 }: { size?: number }) {
  const { c } = useTheme();
  const stroke = c.inkMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" opacity={0.7} accessibilityElementsHidden>
      <Path
        d="M30 108 V48 A30 30 0 0 1 90 48 V108 Z"
        stroke={stroke}
        strokeWidth={1.5}
        fill="none"
      />
      <Line x1={60} y1={18} x2={60} y2={108} stroke={stroke} strokeWidth={1} />
      <Line x1={30} y1={66} x2={90} y2={66} stroke={stroke} strokeWidth={1} />
      <Rect x={24} y={108} width={72} height={4} stroke={stroke} strokeWidth={1.2} fill="none" />
      {[0, 1, 2, 3].map((i) => (
        <Line
          key={i}
          x1={40 + i * 12}
          y1={72}
          x2={26 + i * 16}
          y2={104}
          stroke={c.gilt}
          strokeWidth={0.8}
          strokeDasharray="2 3"
        />
      ))}
    </Svg>
  );
}
