/**
 * VisualizationContainer — Responsive wrapper for chart components.
 *
 * Why isolated:
 * - Provides consistent padding, heading, subtitle pattern for all charts
 * - ResponsiveContainer from Recharts needs a parent with explicit height
 * - Glass styling and mobile adaptation in one place
 * - Components wrapped with React.memo avoid re-rendering when siblings change
 *
 * Why memoization matters:
 * - Recharts renders SVG — DOM diffing is expensive for complex charts
 * - Without memo, parent state changes (typing, loading) cause chart re-mounts
 * - Memo + stable references = chart only re-renders when its data changes
 */

import { memo } from "react";
import type { ReactNode } from "react";

interface VisualizationContainerProps {
  /** Chart title. */
  readonly title: string;
  /** Subtitle / description. */
  readonly subtitle?: string;
  /** Chart content. */
  readonly children: ReactNode;
  /** Optional className override. */
  readonly className?: string;
}

function VisualizationContainerInner({
  title,
  subtitle,
  children,
  className = "",
}: VisualizationContainerProps) {
  return (
    <div className={`glass rounded-xl p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle != null && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

const VisualizationContainer = memo(VisualizationContainerInner);
export default VisualizationContainer;
