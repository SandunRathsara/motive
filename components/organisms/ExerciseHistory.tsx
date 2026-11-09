import { Pressable, Text, View } from 'react-native';
import type { ExerciseHistoryContent } from '@/features/workouts';
import { ShowMoreList } from '@/components/molecules/ShowMoreList';

/** Every session containing the exercise, across all templates (TRN-5). Read-only; a row opens its session. */
export function ExerciseHistory({ content, onOpenSession }: { content: ExerciseHistoryContent; onOpenSession: (sessionId: string) => void }) {
  return (
    <View className="gap-6">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-3xl font-semibold text-text">{content.name}</Text>
        <Text className="text-lg text-muted">{content.muscleGroupLabel} · {content.sessionCountText}</Text>
      </View>
      {content.sessions.length === 0
        ? <Text className="text-lg text-muted">No sessions with this exercise yet.</Text>
        : <ShowMoreList limit={10} noun="sessions">
          {content.sessions.map((session) => (
            <Pressable key={session.sessionId} accessibilityRole="button" accessibilityHint="Opens the session"
              accessibilityLabel={[session.templateName, session.dateText, session.setsText, session.warmupText].filter(Boolean).join(', ')}
              onPress={() => onOpenSession(session.sessionId)} className="min-h-14 min-w-[44px] gap-1 rounded-md bg-surface px-4 py-3">
              <View className="flex-row flex-wrap items-baseline justify-between gap-x-3">
                <Text className="text-lg text-text">{session.templateName}</Text>
                <Text className="text-base text-muted">{session.dateText}</Text>
              </View>
              <Text className="font-display text-xl text-text">{session.setsText}</Text>
              {session.warmupText && <Text className="text-base text-muted">{session.warmupText}</Text>}
            </Pressable>
          ))}
        </ShowMoreList>}
    </View>
  );
}
