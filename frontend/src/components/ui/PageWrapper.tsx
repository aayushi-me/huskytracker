import React from "react";

export const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {children}
    </div>
  );
};

export default PageWrapper;
