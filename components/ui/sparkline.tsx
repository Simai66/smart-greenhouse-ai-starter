export function Sparkline({ values, warning = false }: { values: number[]; warning?: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 120;
      const y = 38 - ((value - min) / Math.max(max - min, 1)) * 30;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 120 44" role="img" aria-label="Recent sensor trend">
      <polyline points={points} fill="none" stroke={warning ? "#f59e0b" : "#22c55e"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
