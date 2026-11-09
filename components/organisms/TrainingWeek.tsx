import { Pressable, Text, View } from 'react-native';
import type { TemplateCardViewModel, TrainingWeekContent } from '@/features/workouts';
import { SegmentedProgress } from '@/components/molecules/SegmentedProgress';
import { ShowMoreList } from '@/components/molecules/ShowMoreList';

const sectionTitle = 'text-xl font-semibold text-text';

function TemplateRow({ template, disabled, onPress }: { template: TemplateCardViewModel; disabled: boolean; onPress: () => void }) {
  const label = [template.name, template.summaryText, template.lastDoneText].join(', ');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={disabled ? undefined : 'Starts a session with this template'}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      className={`min-h-14 min-w-[44px] gap-1 rounded-md border px-4 py-3 ${template.isNext ? 'border-accent bg-surface' : 'border-line-soft bg-surface'}`}>
      <Text className="text-lg text-text">{template.name}</Text>
      <Text className="text-base text-muted">{template.summaryText}</Text>
      <Text className="text-base text-muted">{template.lastDoneText}</Text>
      {template.isNext && <Text className="text-base text-accent">Next in your rotation</Text>}
    </Pressable>
  );
}

/**
 * S2 content: weekly target progress, templates, recent sessions and Other Activity. The primary action
 * (Start or Resume) lives in the template's bottom bar so it stays in thumb reach (UX-8).
 */
export function TrainingWeek({ content, busy = false, onStartTemplate, onOpenSession }: {
  content: TrainingWeekContent;
  /** A start is in flight: template rows ignore taps. */
  busy?: boolean;
  onStartTemplate: (templateId: string) => void;
  onOpenSession: (sessionId: string) => void;
}) {
  const locked = busy || content.active !== null;
  return (
    <View className="gap-8">
      <View className="gap-3 rounded-lg border border-line-soft bg-surface p-6">
        <Text accessibilityRole="header" className={sectionTitle}>{content.weekLabel}</Text>
        <SegmentedProgress label="Weekly sessions" completed={content.completed} total={content.target} valueText={content.progressText} />
        <Text accessibilityLiveRegion="polite" className="text-lg text-text">{content.progressText}</Text>
        {content.targetMet && <Text className="text-base text-muted">Weekly target met</Text>}
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className={sectionTitle}>Templates</Text>
        {content.active && <Text className="text-base text-muted">Finish or resume {content.active.templateName} before starting another session.</Text>}
        {content.templates.length === 0
          ? <Text className="text-base text-muted">No Session Templates yet. Add one in your Training Program.</Text>
          : <ShowMoreList limit={4} noun="templates">
            {content.templates.map((template) => <TemplateRow key={template.id} template={template} disabled={locked}
              onPress={() => onStartTemplate(template.id)} />)}
          </ShowMoreList>}
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className={sectionTitle}>Recent sessions</Text>
        {content.recentSessions.length === 0
          ? <Text className="text-base text-muted">No sessions yet. Your first one will appear here.</Text>
          : <ShowMoreList limit={5} noun="sessions">
            {content.recentSessions.map((session) => (
              <Pressable key={session.sessionId} accessibilityRole="button"
                accessibilityLabel={[session.templateName, session.dateText, session.summaryText, session.statusText].join(', ')}
                accessibilityHint="Opens the session" onPress={() => onOpenSession(session.sessionId)}
                className="min-h-14 min-w-[44px] gap-1 rounded-md bg-surface px-4 py-3">
                <View className="flex-row flex-wrap items-baseline justify-between gap-x-3">
                  <Text className="text-lg text-text">{session.templateName}</Text>
                  <Text className="text-base text-muted">{session.dateText}</Text>
                </View>
                <Text className="text-base text-muted">{session.summaryText}</Text>
                <Text className={`text-base ${session.counts ? 'text-text' : 'text-muted'}`}>{session.statusText}</Text>
                {session.linkedWorkoutText && <Text className="text-base text-muted">{session.linkedWorkoutText}</Text>}
              </Pressable>
            ))}
          </ShowMoreList>}
      </View>

      {content.otherActivity.length > 0 && <View className="gap-3">
        <Text accessibilityRole="header" className={sectionTitle}>Other Activity</Text>
        <Text className="text-base text-muted">From Health. Not counted toward your week.</Text>
        <ShowMoreList limit={5} noun="activities">
          {content.otherActivity.map((activity) => (
            <View key={activity.id} accessible accessibilityLabel={`${activity.title}, ${activity.timeText}, ${activity.durationText}`}
              className="min-h-14 gap-1 rounded-md bg-surface px-4 py-3">
              <Text className="text-lg text-text">{activity.title}</Text>
              <Text className="text-base text-muted">{activity.timeText} · {activity.durationText}</Text>
            </View>
          ))}
        </ShowMoreList>
      </View>}
    </View>
  );
}
