import { ReportTemplate } from '@/components/templates/ReportTemplate';
import { useGateReport } from '@/features/data';

export default function ReportRoute() {
  const model = useGateReport();
  return <ReportTemplate model={model} />;
}
