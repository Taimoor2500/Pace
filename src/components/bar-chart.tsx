import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { colors, radius, space } from '@/theme';
import { Txt } from './text';

type Props = {
  values: number[];
  color: string;
  /** Faded colour for future / unselected bars. */
  mutedColor: string;
  height?: number;
  /** Bars with index > lastActive render muted (e.g. future days). */
  lastActive?: number;
  /** Dashed reference line (e.g. daily budget). */
  reference?: number;
  startLabel?: string;
  endLabel?: string;
  /** Interactive: tap a bar to see its value. */
  formatValue?: (v: number, i: number) => string;
  initialSelected?: number;
};

export function BarChart({
  values,
  color,
  mutedColor,
  height = 140,
  lastActive = values.length - 1,
  reference,
  startLabel,
  endLabel,
  formatValue,
  initialSelected,
}: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | undefined>(initialSelected);
  const max = Math.max(...values, reference ?? 0, 1);
  const n = values.length;
  const gap = n > 20 ? 3 : 6;
  const barW = width > 0 ? (width - gap * (n - 1)) / n : 0;
  const chartH = height;
  const y = (v: number) => chartH - (v / max) * (chartH - 8);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const selX = selected !== undefined ? selected * (barW + gap) + barW / 2 : 0;

  return (
    <View>
      {formatValue && selected !== undefined && width > 0 && (
        <View style={{ height: 32, marginBottom: space.xs }}>
          <View
            style={{
              position: 'absolute',
              left: Math.min(Math.max(0, selX - 48), width - 96),
              width: 96,
              height: 28,
              borderRadius: radius.pill,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt variant="captionStrong" money style={{ color: colors.onInk }}>{formatValue(values[selected], selected)}</Txt>
          </View>
        </View>
      )}
      <View onLayout={onLayout} style={{ height: chartH }}>
        {width > 0 && (
          <Svg width={width} height={chartH}>
            {values.map((v, i) => {
              const h = Math.max(4, chartH - y(v));
              const active = selected !== undefined ? i === selected : i <= lastActive;
              return (
                <Rect
                  key={i}
                  x={i * (barW + gap)}
                  y={chartH - h}
                  width={barW}
                  height={h}
                  rx={Math.min(barW / 2, 6)}
                  fill={active ? color : mutedColor}
                />
              );
            })}
            {reference !== undefined && (
              <Line x1={0} x2={width} y1={y(reference)} y2={y(reference)} stroke={colors.ink40} strokeWidth={1} strokeDasharray="4 4" />
            )}
          </Svg>
        )}
        {formatValue && (
          // Tap targets laid over the bars — full-height columns are easier to hit than thin bars.
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, flexDirection: 'row', gap }}>
              {values.map((_, i) => (
                <Pressable key={i} style={{ flex: 1 }} onPress={() => setSelected(i)} accessibilityLabel={formatValue(values[i], i)} />
              ))}
            </View>
          </View>
        )}
      </View>
      {(startLabel || endLabel) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs }}>
          <Txt variant="caption">{startLabel}</Txt>
          <Txt variant="caption">{endLabel}</Txt>
        </View>
      )}
    </View>
  );
}
