import { Text, View } from 'react-native';
import type { SessionSummaryContent } from '@/features/workouts';

/**
 * S5 body (TRN-8): volume from loaded working sets, sets per muscle group, the comparison with this
 * template's previous completed session and the one deterministic "next time" line. Copy is
 * pre-formatted by the view model; a missing value is a dash, never a zero. Direction is carried by
 * the words and signs in the comparison text, never by color.
 */
export function SessionSummary({ content }: { content: SessionSummaryContent }) {
  const noVolume = content.volumeText === '—';
  return (
    <View className="gap-6">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-2xl font-semibold text-text">{content.templateName}</Text>
        <Text className="text-base text-muted">{content.dateText}{content.durationText ? ` · ${content.durationText}` : ''}</Text>
      </View>

      <View className="gap-3 rounded-lg border border-line-soft bg-surface p-6">
        <View accessible accessibilityRole="summary" accessibilityLabel="Volume"
          accessibilityValue={{ text: noVolume ? 'No loaded sets' : content.volumeText }}>
          <Text className="text-base text-muted">Volume</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} className="font-display text-4xl text-text">{content.volumeText}</Text>
        </View>
        <Text className="text-lg text-text">{content.setsText}</Text>
        {content.bodyweightRepsText && <Text className="text-lg text-text">{content.bodyweightRepsText}</Text>}
        {content.comparison && <Text className="text-lg text-muted">{content.comparison.text}</Text>}
      </View>

      {content.muscleGroups.length > 0 && (
        <View className="gap-2">
          <Text accessibilityRole="header" className="text-lg font-semibold text-text">Sets by muscle group</Text>
          {content.muscleGroups.map((group) => (
            <Text key={group.muscleGroup} className="text-lg text-text">{group.text}</Text>
          ))}
        </View>
      )}

      {content.nextTimeLine && (
        <View className="gap-2 rounded-lg border border-line-soft bg-surface p-6">
          <Text accessibilityRole="header" className="text-lg font-semibold text-text">Next time</Text>
          <Text className="text-lg text-text">{content.nextTimeLine}</Text>
        </View>
      )}

      <View className="gap-1">
        <Text className="text-base text-muted">{content.countsText}</Text>
        {content.linkedWorkoutText && <Text className="text-base text-muted">{content.linkedWorkoutText}</Text>}
      </View>
    </View>
  );
}
