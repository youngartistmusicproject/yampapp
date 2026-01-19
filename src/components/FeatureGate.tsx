import { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { isEnabled, isLoading } = useFeatureFlag(feature);

  // While loading, don't render anything to prevent flash
  if (isLoading) {
    return null;
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
