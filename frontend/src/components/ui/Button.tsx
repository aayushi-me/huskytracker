import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";

type ButtonOwnProps<E extends React.ElementType> = {
  as?: E;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
};

type ButtonProps<E extends React.ElementType = "button"> = ButtonOwnProps<E> &
  Omit<React.ComponentPropsWithoutRef<E>, keyof ButtonOwnProps<E>>;

const baseStyles = `
  inline-flex items-center justify-center font-medium rounded-lg transition-all
  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  active:scale-95
`;

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 focus:ring-primary",
  secondary: "bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary",
  outline: "border border-gray-300 text-gray-800 hover:bg-gray-100 focus:ring-gray-300",
  danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
  ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-300",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

export default function Button<E extends React.ElementType = "button">({
  as,
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...rest
}: ButtonProps<E>) {
  const Component = (as ?? "button") as React.ElementType;
  const isNativeButton = Component === "button";
  const isDisabled = Boolean(isLoading || disabled);

  const combinedClassName = [
    baseStyles,
    variants[variant],
    sizes[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const componentProps = {
    ...rest,
    className: combinedClassName,
  } as React.ComponentPropsWithoutRef<E>;

  if (isNativeButton) {
    const nativeProps = componentProps as React.ButtonHTMLAttributes<HTMLButtonElement>;
    nativeProps.disabled = isDisabled;
    nativeProps.type = nativeProps.type ?? "button";
  } else if (isDisabled) {
    const nonButtonProps = componentProps as React.AriaAttributes & {
      role?: string;
    };
    nonButtonProps["aria-disabled"] = true;
    nonButtonProps.role = nonButtonProps.role ?? "button";
  }

  return (
    <Component {...componentProps}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Component>
  );
}
