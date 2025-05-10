import React from "react";
import { headingClasses, normalTextClasses } from "./sharedStyles.ts";

export function NotFoundPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 text-center">
      <h1 className={headingClasses}>
        You seem to be lost!
      </h1>
      <p className={normalTextClasses}>
        The page you're looking for doesn't exist.
      </p>
    </div>
  );
}
