import { AboutTemplate } from '@/components/templates/AboutTemplate';
import { buildIdentity } from '@/lib/build';

export default function AboutRoute() {
  return <AboutTemplate identity={buildIdentity} />;
}
