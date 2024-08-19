// client/src/App.js
import React from "react";
import AudioCall from "./AudioCall";

function App() {
  return (
    <div className="App">
      <h1>Audio Call</h1>
      <AudioCall />
    </div>
  );
}

export default App;

// socketRef.current = io.connect(`${import.meta.env.VITE_API}`);