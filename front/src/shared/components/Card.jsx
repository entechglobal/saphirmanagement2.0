export const Card = ({ children, title, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {title && <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h3>}
      {children}
    </div>
  )
}
