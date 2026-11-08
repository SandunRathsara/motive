import { Pressable, Text, View } from 'react-native';
import type { GateReportViewModel } from '@/features/data';
import { ActionButton } from '@/components/atoms/ActionButton';

const eventLabels = new Map([
  ['food_active_input', 'Food active input time'], ['recognition_wait', 'Recognition wait'],
  ['set_logging', 'Set logging time'], ['unclean_exit', 'Unclean exits'],
]);
const seconds = (duration: number | null) => duration === null ? '—' : `${(duration / 1000).toFixed(1)} s`;

export function GateReport({ model }: { model: GateReportViewModel }) {
  const { report } = model;
  if (model.status === 'loading') return <Text accessibilityLiveRegion="polite" className="text-lg text-muted">Loading report…</Text>;
  return (
    <View className="gap-6">
      {model.status === 'error' && <View className="gap-3">
        <Text accessibilityRole="alert" selectable className="text-lg text-danger">
          {report ? 'Couldn’t refresh the report. Showing the last loaded report.' : 'Couldn’t load the report. Try again.'}
        </Text>
        <ActionButton label="Retry" onPress={model.retry} />
      </View>}
      {report && <>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">Builds</Text>
        <View className="flex-row flex-wrap gap-3">
          {[{ build: null, label: 'All builds' }, ...model.builds.map(({ build, count }) => ({
            build, label: `${build} · ${count} ${count === 1 ? 'sample' : 'samples'}`,
          }))].map(({ build, label }) => <Pressable key={build ?? 'all'} accessibilityRole="button"
            accessibilityLabel={label} accessibilityState={{ selected: model.selectedBuild === build }}
            onPress={() => model.selectBuild(build)}
            className={`min-h-14 min-w-[44px] max-w-full justify-center rounded-sm border bg-surface px-4 py-3 ${model.selectedBuild === build ? 'border-accent' : 'border-line'}`}>
            <Text className="text-lg text-text">{model.selectedBuild === build ? '✓ ' : ''}{label}</Text>
          </Pressable>)}
        </View>
      </View>
      {!report.groups.some((group) => group.count > 0) && <Text className="text-lg text-muted">No metrics recorded yet.</Text>}
      {report.groups.map((group) => <View key={group.eventType} className="gap-2 rounded-md bg-surface p-4">
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">{eventLabels.get(group.eventType) ?? group.eventType}</Text>
        <Text selectable className="text-lg text-text">Count: {group.count}</Text>
        {group.eventType !== 'unclean_exit' && <>
          <Text selectable className="text-lg text-muted">Median: {seconds(group.medianMs)}</Text>
          <Text selectable className="text-lg text-muted">p90: {seconds(group.p90Ms)}</Text>
          {group.eventType === 'recognition_wait' && group.p95Ms !== undefined && <Text selectable className="text-lg text-muted">p95: {seconds(group.p95Ms)}</Text>}
        </>}
      </View>)}
      <View className="gap-2">
        <Text selectable className="text-lg text-text">Unclean exits: {report.uncleanExitCount}</Text>
        <Text className="text-base text-muted">Unclean exits are crash evidence, not user force-quits.</Text>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-xl font-semibold text-text">Daily input totals</Text>
        <Text className="text-base text-muted">Food and training input time. Days start at 04:00 local time.</Text>
        {report.dailyTotals.length === 0 ? <Text className="text-lg text-muted">No input times recorded yet.</Text>
          : report.dailyTotals.map(({ day, totalMs, count }) => <Text key={day} selectable className="text-lg text-text">
            {day} · {seconds(totalMs)} · {count} {count === 1 ? 'input' : 'inputs'}
          </Text>)}
      </View>
      {report.skippedCount > 0 && <Text className="text-lg text-muted">{report.skippedCount} {report.skippedCount === 1 ? 'row couldn’t be read and was' : 'rows couldn’t be read and were'} skipped.</Text>}
      </>}
    </View>
  );
}
