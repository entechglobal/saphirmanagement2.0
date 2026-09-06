"use client"

export const Button = ({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  fullWidth = false,
  className = "",
}) => {
  const baseStyles =
    "px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"

  const variants = {
    primary: "bg-primary text-white hover:bg-[#B05596]",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-[#2e2e2e] dark:text-gray-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
    outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white",
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  )
}
