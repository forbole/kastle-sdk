import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { isKaslteInstalled } from "@forbole/kastle-sdk";

function App() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkIfInstalled = async () => {
      let b = await isKaslteInstalled();
      setIsInstalled(b);
    };

    checkIfInstalled();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <span>{isInstalled ? "yes" : "no"}</span>
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
