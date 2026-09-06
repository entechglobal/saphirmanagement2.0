export const HeaderSkeleton = () => (
  <div className="flex items-center gap-3 animate-pulse">
    {/* Logo Skeleton */}
    <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-[#222222]" />

    {/* Text Skeleton */}
    <div className="flex flex-col gap-2">
      <div className="h-2 w-16 bg-slate-200 dark:bg-[#222222] rounded" />
      <div className="h-4 w-32 bg-slate-200 dark:bg-[#222222] rounded" />
    </div>
  </div>
);