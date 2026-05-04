import { ReactNode } from "react";
import HuskyLogo from "../assets/NewLogoHuskyTrack.svg";

export default function AuthPageLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-10">
        <img src={HuskyLogo} alt="Husky logo" className="h-8 w-auto" />
        <span className="text-xl font-semibold text-primary tracking-tight">
          Husky
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 max-w-md">{subtitle}</p>
        )}
      </div>

      {children}
    </>
  );
}
