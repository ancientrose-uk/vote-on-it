import React from "react";
import {
  headingClasses,
  normalLinkClasses,
  normalTextClasses,
} from "./sharedStyles.ts";

export function HomePage() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className={headingClasses}>
        Welcome to Vote On It!
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className={normalTextClasses}>
          If you're supposed to be using this site you will have been provided
          with the correct link. Please follow that link.
        </p>
        <p className={normalTextClasses}>
          If you're just curious about the project it's open source and you can
          {" "}
          <a
            className={normalLinkClasses}
            href="https://github.com/ancientrose-uk/vote-on-it"
            target="_blank"
          >
            find out more on the GitHub page
          </a>.
        </p>
      </div>
    </div>
  );
}
