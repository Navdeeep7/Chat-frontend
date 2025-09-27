"use client";
import { useEffect, useState, useRef } from "react";

export default function MyComponent() {
  const [messages, setMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Disconnect socket on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket) socket.close();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket]);

  const joinChat = () => {
    if (!name.trim()) return;
    const newSocket = new WebSocket("wss://chat-app-backend-390l.onrender.com");

    newSocket.onopen = () => {
      newSocket.send(`${name} joined the chat`);
      setIsConnected(true);
    };

    newSocket.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    newSocket.onclose = () => setIsConnected(false);
    setSocket(newSocket);
  };

  const sendMessage = () => {
    if (
      socket &&
      socket.readyState === WebSocket.OPEN &&
      inputValue.trim() !== ""
    ) {
      socket.send(`${name}: ${inputValue}`);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 shadow-lg rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 px-4 py-3 text-center font-semibold">
          {isConnected ? `Chatting as ${name}` : "Join the Chat"}
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900 max-h-[400px]">
          {messages.length === 0 && (
            <p className="text-gray-500 text-center">No messages yet…</p>
          )}
          {messages.map((msg, idx) => {
            // System message: "joined/left the chat"
            if (msg.includes("joined the chat") || msg.includes("left the chat")) {
              return (
                <div key={idx} className="text-center text-xs text-gray-400">
                  {msg.toLowerCase()}
                </div>
              );
            }

            // Normal messages: "Name: Message"
            const separatorIndex = msg.indexOf(":");
            let sender = "";
            let text = msg;

            if (separatorIndex !== -1) {
              sender = msg.slice(0, separatorIndex);
              text = msg.slice(separatorIndex + 1).trim();
            }

            const isOwn = sender === name;

            return (
              <div
                key={idx}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[75%]">
                  {!isOwn && (
                    <div className="text-xs text-gray-400 mb-0.5">{sender}</div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-xl break-words ${
                      isOwn
                        ? "bg-green-600 text-white rounded-br-none"
                        : "bg-gray-700 text-gray-100 rounded-bl-none"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {!isConnected ? (
          <div className="flex gap-2 p-3 border-t border-gray-700 bg-gray-800">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1 px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              disabled={isConnected}
            />
            <button
              onClick={joinChat}
              disabled={isConnected}
              className={`px-4 py-2 rounded-lg text-white transition ${
                isConnected
                  ? "bg-gray-500"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isConnected ? "Joined" : "Join"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 p-3 border-t border-gray-700 bg-gray-800">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
