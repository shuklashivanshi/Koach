import { radius, space } from '@koach/ui';
import { View } from 'react-native';
import { pct } from '@/optionals/format';
import { Text } from './Text';
import { useTheme } from './useTheme';

type Year = { examYear: number; appeared: number; recommended: number };
type Pooled = {
  rate: number | null;
  low: number | null;
  high: number | null;
  smallSample: boolean;
};

const num = (n: number) => n.toLocaleString('en-IN');

/**
 * Official success rate by year on one shared axis, with the pooled 95% band behind every
 * track. Every row also carries its numbers as text, so nothing depends on colour or position.
 */
export function BandChart({ years, pooled }: { years: Year[]; pooled: Pooled }) {
  const { c } = useTheme();
  if (years.length === 0) return null;
  const rates = years.map((y) => (y.appeared > 0 ? y.recommended / y.appeared : 0));
  const scale = Math.max(pooled.high ?? 0, ...rates, 0.05) * 1.15;
  const at = (x: number) => `${Math.min(100, (x / scale) * 100)}%` as const;
  const rowHeight = space.lg;
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 3 }}>
          {years.map((y) => (
            <View key={y.examYear} style={{ height: rowHeight, justifyContent: 'center' }}>
              <Text variant="caption" numberOfLines={1}>
                {`${y.examYear}: ${num(y.recommended)} of ${num(y.appeared)} (${pct(y.appeared > 0 ? y.recommended / y.appeared : null)})`}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 2 }}>
          {pooled.low !== null && pooled.high !== null && (
            <View
              testID="band"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: at(pooled.low),
                width: at(pooled.high - pooled.low),
                backgroundColor: c.plaid,
                opacity: 0.5,
              }}
            />
          )}
          {years.map((y, i) => (
            <View key={y.examYear} style={{ height: rowHeight, justifyContent: 'center' }}>
              <View style={{ height: space.xs / 2, backgroundColor: c.linen }} />
              {y.appeared > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    left: at(rates[i]!),
                    marginLeft: -space.xs,
                    width: space.sm,
                    height: space.sm,
                    borderRadius: radius.chip,
                    backgroundColor: c.leather,
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </View>
      <Text variant="caption" muted>
        {pooled.rate === null
          ? 'No pooled rate'
          : `Pooled ${pct(pooled.rate)} (${pct(pooled.low)}-${pct(pooled.high)})`}
      </Text>
      {pooled.smallSample && (
        <Text variant="caption" muted>
          Few candidates
        </Text>
      )}
    </View>
  );
}
