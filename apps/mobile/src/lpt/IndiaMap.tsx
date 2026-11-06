import { type GestureResponderEvent, Pressable } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/ui/useTheme';

// Stylised sepia outline of India (UI_SPEC §10.3), including all of Jammu & Kashmir and Ladakh.
// Equirectangular: lon 68–98°E → x 0–300, lat 38–6°N → y 0–320 (10 px per degree).

export const MAP_W = 300;
export const MAP_H = 320;
export const toXY = (lat: number, lon: number) => ({ x: (lon - 68) * 10, y: (38 - lat) * 10 });
export const toLatLon = (x: number, y: number) => ({ lat: 38 - y / 10, lon: 68 + x / 10 });

const OUTLINE: [number, number][] = [
  [68.2, 23.7],
  [68.8, 22.3],
  [70.0, 20.9],
  [72.6, 21.6],
  [72.8, 19.0],
  [73.4, 16.0],
  [74.6, 13.0],
  [75.8, 11.0],
  [76.6, 8.9],
  [77.5, 8.1],
  [78.2, 8.9],
  [79.3, 10.3],
  [79.9, 11.8],
  [80.3, 13.4],
  [80.1, 15.5],
  [81.3, 16.4],
  [82.3, 17.0],
  [84.8, 19.3],
  [86.4, 20.0],
  [87.0, 21.5],
  [88.2, 21.6],
  [89.0, 21.9],
  [88.7, 24.2],
  [88.1, 25.2],
  [88.4, 26.4],
  [89.8, 26.7],
  [92.0, 26.8],
  [92.2, 25.0],
  [91.8, 24.2],
  [92.0, 23.0],
  [92.7, 22.0],
  [93.4, 22.6],
  [93.9, 23.8],
  [94.6, 25.4],
  [95.3, 26.7],
  [96.6, 27.4],
  [97.4, 28.3],
  [96.0, 29.4],
  [94.6, 29.3],
  [92.6, 27.9],
  [91.6, 27.8],
  [89.8, 26.9],
  [88.8, 28.1],
  [88.2, 27.9],
  [88.1, 26.5],
  [85.0, 26.6],
  [83.0, 27.4],
  [80.1, 28.8],
  [80.9, 30.2],
  [79.0, 31.3],
  [78.4, 32.5],
  [79.4, 32.9],
  [80.3, 35.4],
  [77.8, 35.5],
  [76.0, 36.0],
  [74.5, 37.0],
  [72.6, 36.8],
  [73.6, 34.3],
  [73.5, 33.0],
  [74.6, 32.0],
  [74.5, 31.0],
  [73.9, 30.0],
  [73.4, 29.2],
  [71.9, 28.0],
  [70.4, 26.5],
  [69.5, 25.0],
  [68.8, 24.3],
];
const PATH =
  OUTLINE.map(([lon, lat], i) => {
    const { x, y } = toXY(lat, lon);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';

/** Tap position inside the map. Native gives locationX/Y; on web derive it from the element box. */
function tapPoint(e: GestureResponderEvent): { x: number; y: number } {
  const { locationX, locationY } = e.nativeEvent;
  if (Number.isFinite(locationX) && Number.isFinite(locationY))
    return { x: locationX, y: locationY };
  const target = e.currentTarget as unknown as { getBoundingClientRect?: () => DOMRect };
  const box = target.getBoundingClientRect?.();
  const ne = e.nativeEvent as unknown as { clientX?: number; clientY?: number };
  if (!box || ne.clientX === undefined || ne.clientY === undefined) return { x: NaN, y: NaN };
  return { x: ne.clientX - box.left, y: ne.clientY - box.top };
}

export interface Pin {
  name: string;
  lat: number;
  lon: number;
  /** Faint "truth" pin vs the learner's pin. */
  ghost?: boolean;
}

export function IndiaMap({
  pins,
  onTap,
}: {
  pins: Pin[];
  onTap?: (p: { lat: number; lon: number }) => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={!onTap}
      onPress={(e) => {
        const { x, y } = tapPoint(e);
        if (Number.isFinite(x) && Number.isFinite(y)) onTap?.(toLatLon(x, y));
      }}
      style={{ width: MAP_W, height: MAP_H, alignSelf: 'center' }}
      accessibilityLabel="Map of India"
    >
      <Svg width={MAP_W} height={MAP_H} pointerEvents="none">
        {[10, 15, 20, 25, 30, 35].map((lat) => (
          <Line
            key={lat}
            x1={0}
            x2={MAP_W}
            y1={toXY(lat, 68).y}
            y2={toXY(lat, 68).y}
            stroke={c.hairline}
            strokeWidth={0.5}
          />
        ))}
        <Path d={PATH} fill={c.cream} stroke={c.inkMuted} strokeWidth={1.2} />
        {pins.map((p) => {
          const { x, y } = toXY(p.lat, p.lon);
          return [
            <Circle
              key={`${p.name}-c`}
              cx={x}
              cy={y}
              r={4}
              fill={p.ghost ? c.hairline : c.leather}
            />,
            <SvgText key={`${p.name}-t`} x={x + 6} y={y + 4} fontSize={10} fill={c.ink}>
              {p.name}
            </SvgText>,
          ];
        })}
      </Svg>
    </Pressable>
  );
}
