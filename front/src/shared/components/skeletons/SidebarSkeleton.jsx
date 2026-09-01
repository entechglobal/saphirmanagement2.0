export const SidebarSkeleton = () => (
  <div className="flex flex-col h-full animate-pulse">
    {/* Nav Section Label */}
    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded ml-3 mb-6" />

    {/* Menu Items */}
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          {/* Icon Circle */}
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          {/* Text Line */}
          <div className="h-4 flex-1 bg-gray-100 dark:bg-gray-800 rounded-md max-w-[140px]" />
        </div>
      ))}
    </div>
  </div>
);