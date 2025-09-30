// client/src/App.js
import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:4000"); // backend server URL

function App() {
  const [content, setContent] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Join a sample doc (you can make docId dynamic later)
    socket.emit("join-doc", { docId: "demo-doc", userName: "User1" });

    socket.on("doc-load", ({ content, version }) => {
      setContent(content);
      setVersion(version);
    });

    socket.on("doc-update", ({ content, version }) => {
      setContent(content);
      setVersion(version);
    });

    socket.on("version-mismatch", ({ content, version }) => {
      setContent(content);
      setVersion(version);
    });

    return () => {
      socket.off("doc-load");
      socket.off("doc-update");
      socket.off("version-mismatch");
    };
  }, []);

  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    socket.emit("doc-change", {
      docId: "demo-doc",
      content: newContent,
      version,
    });
  };

  return (
    <div className="app-container">
      <h2>📝 Real-time Collaborative Document Editor</h2>
      <textarea
        rows={15}
        cols={80}
        value={content}
        onChange={handleChange}
      />
    </div>
  );
}

export default App;
