// SkeletonRows.jsx
// Table skeleton rows for loading state

const SkeletonRows = ({ cols }) =>
  Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-6 py-4">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24" />
        </td>
      ))}
    </tr>
  ));

export default SkeletonRows;
