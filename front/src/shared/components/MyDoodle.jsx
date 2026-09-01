import Colored from "@/assets/Colored.svg";

export const MyDoodle = ({ className = "", opacity = 0.04 }) => {
  return (
    <img
      src={Colored}
      className={className}
      style={{ opacity }}
      alt=""
      aria-hidden="true"
    />
  );
};
