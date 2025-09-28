"use client";
import { useEffect, useState, useRef } from "react";
import { Send, Reply, X, Users, Wifi, WifiOff } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  type: 'message' | 'system';
  replyTo?: {
    id: string;
    text: string;
    sender: string;
  };
}

export default function WhatsAppChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Disconnect socket on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket) socket.close();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket]);

  const generateMessageId = () => Math.random().toString(36).substr(2, 9);

  const parseMessage = (rawMessage: string): Message => {
    const timestamp = new Date();
    const id = generateMessageId();
    
    // System messages
    if (rawMessage.includes("joined the chat") || rawMessage.includes("left the chat")) {
      return {
        id,
        text: rawMessage,
        sender: "system",
        timestamp,
        type: 'system'
      };
    }

    // Parse reply format: "Name: [REPLY_TO:id:sender:text] actual message"
    const replyMatch = rawMessage.match(/^([^:]+):\s*\[REPLY_TO:([^:]+):([^:]+):([^\]]+)\]\s*(.+)$/);
    if (replyMatch) {
      const [, sender, replyId, replySender, replyText, text] = replyMatch;
      return {
        id,
        text,
        sender,
        timestamp,
        type: 'message',
        replyTo: {
          id: replyId,
          sender: replySender,
          text: replyText
        }
      };
    }

    // Normal message format: "Name: Message"
    const separatorIndex = rawMessage.indexOf(":");
    if (separatorIndex !== -1) {
      const sender = rawMessage.slice(0, separatorIndex);
      const text = rawMessage.slice(separatorIndex + 1).trim();
      return {
        id,
        text,
        sender,
        timestamp,
        type: 'message'
      };
    }

    // Fallback
    return {
      id,
      text: rawMessage,
      sender: "unknown",
      timestamp,
      type: 'message'
    };
  };

  const joinChat = async () => {
    if (!name.trim() || isJoining) return;
    
    setIsJoining(true);
    const newSocket = new WebSocket("wss://chat-app-backend-390l.onrender.com");

    newSocket.onopen = () => {
      newSocket.send(`${name} joined the chat`);
      setIsConnected(true);
      setIsJoining(false);
      setOnlineUsers(prev => prev + 1);
    };

    newSocket.onmessage = (event) => {
      const parsedMessage = parseMessage(event.data);
      setMessages((prev) => [...prev, parsedMessage]);
      
      // Update online users count (simplified logic)
      if (parsedMessage.text.includes("joined the chat")) {
        setOnlineUsers(prev => prev + 1);
      } else if (parsedMessage.text.includes("left the chat")) {
        setOnlineUsers(prev => Math.max(0, prev - 1));
      }
    };

    newSocket.onclose = () => {
      setIsConnected(false);
      setIsJoining(false);
      setOnlineUsers(0);
    };

    newSocket.onerror = () => {
      setIsJoining(false);
    };

    setSocket(newSocket);
  };

  const sendMessage = () => {
    if (
      socket &&
      socket.readyState === WebSocket.OPEN &&
      inputValue.trim() !== ""
    ) {
      let messageToSend = `${name}: ${inputValue}`;
      
      // Add reply information if replying
      if (replyingTo) {
        messageToSend = `${name}: [REPLY_TO:${replyingTo.id}:${replyingTo.sender}:${replyingTo.text}] ${inputValue}`;
      }
      
      socket.send(messageToSend);
      setInputValue("");
      setReplyingTo(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleReply = (message: Message) => {
    if (message.type === 'system') return;
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-neutral-900 shadow-xl rounded-2xl flex flex-col overflow-hidden border border-neutral-800">
          {/* Header */}
          <div className="px-5 py-4 bg-neutral-900 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-medium text-lg text-white">
                  {isConnected ? "Group Chat" : "Join Chat"}
                </h1>
                {isConnected && (
                  <div className="flex items-center gap-2 text-neutral-400 text-sm mt-0.5">
                    {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    <span>{onlineUsers} online</span>
                  </div>
                )}
              </div>
              {isConnected && (
                <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-neutral-300">{name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-950 max-h-[500px] min-h-[400px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <Users size={32} className="text-neutral-600 mb-3" />
                <p className="text-neutral-500 text-sm">No messages yet</p>
              </div>
            )}
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full text-xs">
                      {msg.text.toLowerCase()}
                    </div>
                  </div>
                );
              }

              const isOwn = msg.sender === name;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
                >
                  <div className={`max-w-[80%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && (
                      <div className="text-xs text-neutral-500 mb-1 px-1">
                        {msg.sender}
                      </div>
                    )}
                    <div className="relative">
                      <div
                        className={`px-3 py-2 rounded-2xl ${
                          isOwn
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-neutral-800 text-neutral-100 rounded-bl-md"
                        }`}
                      >
                        {/* Reply preview */}
                        {msg.replyTo && (
                          <div className={`mb-2 pb-2 border-l-2 pl-2 ${
                            isOwn ? "border-blue-300" : "border-neutral-600"
                          }`}>
                            <div className="text-xs opacity-80 font-medium">
                              {msg.replyTo.sender}
                            </div>
                            <div className="text-xs opacity-60 truncate">
                              {msg.replyTo.text}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-end gap-2">
                          <span className="flex-1 text-sm">{msg.text}</span>
                          <span className="text-xs opacity-60 flex-shrink-0">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Reply button */}
                      {!isOwn && (
                        <button
                          onClick={() => handleReply(msg)}
                          className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 md:group-hover:opacity-100 md:transition-opacity md:p-1 md:hover:bg-neutral-800 rounded-full 
                                   sm:opacity-100 sm:p-0.5 sm:bg-neutral-800/70 sm:-right-7"
                          title="Reply"
                        >
                          <Reply size={12} className="text-neutral-400 sm:text-neutral-300" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply preview */}
          {replyingTo && (
            <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 border-l-2 border-blue-500 pl-3">
                  <div className="text-sm text-blue-400">
                    Replying to {replyingTo.sender}
                  </div>
                  <div className="text-sm text-neutral-400 truncate">
                    {replyingTo.text}
                  </div>
                </div>
                <button
                  onClick={cancelReply}
                  className="ml-2 p-1 hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X size={14} className="text-neutral-500" />
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          {!isConnected ? (
            <div className="p-4 bg-neutral-900 border-t border-neutral-800">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-neutral-500"
                  disabled={isJoining}
                  onKeyPress={(e) => e.key === 'Enter' && joinChat()}
                />
                <button
                  onClick={joinChat}
                  disabled={isJoining || !name.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isJoining || !name.trim()
                      ? "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isJoining ? "Joining..." : "Join"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-neutral-900 border-t border-neutral-800">
              <div className="flex items-end gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 px-3 py-2 bg-neutral-800 text-white border border-neutral-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder-neutral-500"
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim()}
                  className={`p-2 rounded-lg transition-colors ${
                    inputValue.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}