import React from "react";

export const BackgroundDecoration = ({
  position = "top-right",
  opacity = 0.04,
}) => {
  const positions = {
    "top-right": "top-[-120px] right-[-120px]",
    "top-left": "top-[-120px] left-[-120px]",
    "bottom-right": "bottom-[-120px] right-[-120px]",
    "bottom-left": "bottom-[-120px] left-[-120px]",
  };

  return (
    <svg
      viewBox="0 0 600 600"
      className={`absolute ${positions[position]} w-[420px] h-[420px] pointer-events-none`}
      style={{ opacity }}
    >
      <path
        d="M300 60
           C430 60 540 170 540 300
           C540 430 430 540 300 540
           C170 540 60 430 60 300
           C60 170 170 60 300 60Z"
        fill="currentColor"
      />
    </svg>
  );
};
