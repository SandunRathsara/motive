import { ScrollView } from 'react-native';
import type { GateReportViewModel } from '@/features/data';
import { GateReport } from '@/components/organisms/GateReport';

export function ReportTemplate({ model }: { model: GateReportViewModel }) {
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="p-6 pb-10">
      <GateReport model={model} />
    </ScrollView>
  );
}
