import React from "react";
import "./CSELoader.css";

const CSELoader = () => {
  return (
    <div className="cse-loader-container">
      <div className="cse-spinner">
        <div className="cse-letter c">C</div>
        <div className="cse-letter s">S</div>
        <div className="cse-letter e">E</div>
      </div>
      <div className="cse-subtitle">Computer Science & Engineering</div>
      <div className="loading-dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    </div>
  );
};

export default CSELoader;
