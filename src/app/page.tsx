"use client";
import { useEffect, useState, useRef } from "react";
import { Send, Reply, X, Users, Wifi, WifiOff, MessageCircle } from "lucide-react";

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]"></div>
      </div>
      
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md backdrop-blur-xl bg-slate-800/70 shadow-2xl rounded-3xl flex flex-col overflow-hidden border border-slate-700/50 ring-1 ring-white/10">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 text-white border-b border-slate-600/50">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {isConnected ? "Group Chat" : "Join Chat"}
                </h1>
                {isConnected && (
                  <div className="flex items-center gap-2 text-slate-300 text-sm mt-1">
                    
                  
                  </div>
                )}
              </div>
              {isConnected && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-600/50">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-200">{name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-900/50 to-slate-800/50 max-h-[500px] min-h-[400px] backdrop-blur-sm">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-30"></div>
                  <MessageCircle size={64} className="relative text-slate-500" />
                </div>
                <p className="text-center font-medium text-slate-300">No messages yet…</p>
                <p className="text-xs text-center mt-2 text-slate-500">Start the conversation and connect with others!</p>
              </div>
            )}
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 backdrop-blur-sm text-slate-300 px-4 py-2 rounded-full text-xs border border-slate-600/30 shadow-lg">
                      <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                        {msg.text.toLowerCase()}
                      </span>
                    </div>
                  </div>
                );
              }

              const isOwn = msg.sender === name;
              const showSender = !isOwn && msg.sender !== "system";

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
                >
                  <div className={`max-w-[85%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                    {showSender && (
                      <div className="text-xs text-slate-400 mb-1 px-2 font-medium">
                        {msg.sender}
                      </div>
                    )}
                    <div className="relative">
                      <div
                        className={`px-4 py-3 rounded-2xl break-words shadow-lg backdrop-blur-sm relative group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-300 border ${
                          isOwn
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md border-blue-500/20 shadow-blue-500/25"
                            : "bg-slate-700/70 text-slate-100 rounded-bl-md border-slate-600/50 shadow-slate-900/50"
                        }`}
                      >
                        {/* Reply preview */}
                        {msg.replyTo && (
                          <div className={`mb-3 pb-2 border-l-4 pl-3 rounded-r ${
                            isOwn 
                              ? "border-blue-300 bg-white/10 backdrop-blur-sm" 
                              : "border-purple-400 bg-slate-600/50 backdrop-blur-sm"
                          }`}>
                            <div className="text-xs opacity-90 font-semibold mb-1">
                              {msg.replyTo.sender}
                            </div>
                            <div className="text-xs opacity-70 truncate">
                              {msg.replyTo.text}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-end gap-3">
                          <span className="flex-1 leading-relaxed">{msg.text}</span>
                          <span className={`text-xs opacity-70 flex-shrink-0 font-mono ${
                            isOwn ? "text-blue-100" : "text-slate-400"
                          }`}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Reply button */}
                      {!isOwn && (
                        <button
                          onClick={() => handleReply(msg)}
                          className="absolute -right-10 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 hover:bg-slate-600/50 rounded-full backdrop-blur-sm border border-slate-500/30"
                          title="Reply"
                        >
                          <Reply size={14} className="text-slate-300" />
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
            <div className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-600/50 px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 border-l-4 border-purple-400 pl-3 bg-slate-700/30 rounded-r p-2">
                  <div className="text-sm font-semibold text-purple-300 mb-1">
                    Replying to {replyingTo.sender}
                  </div>
                  <div className="text-sm text-slate-300 truncate">
                    {replyingTo.text}
                  </div>
                </div>
                <button
                  onClick={cancelReply}
                  className="ml-3 p-1.5 hover:bg-slate-600/50 rounded-full transition-colors backdrop-blur-sm border border-slate-500/30"
                >
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          {!isConnected ? (
            <div className="p-4 bg-slate-800/80 backdrop-blur-sm border-t border-slate-600/50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 px-4 py-3 bg-slate-700/50 backdrop-blur-sm text-slate-100 placeholder-slate-400 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  disabled={isJoining}
                  onKeyPress={(e) => e.key === 'Enter' && joinChat()}
                />
                <button
                  onClick={joinChat}
                  disabled={isJoining || !name.trim()}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all transform backdrop-blur-sm border ${
                    isJoining || !name.trim()
                      ? "bg-slate-600/50 text-slate-400 cursor-not-allowed border-slate-500/30"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:scale-105 shadow-lg hover:shadow-purple-500/25 border-blue-500/20"
                  }`}
                >
                  {isJoining ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                      Joining...
                    </div>
                  ) : (
                    "Join Chat"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-800/80 backdrop-blur-sm border-t border-slate-600/50">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a message…"
                    className="w-full px-4 py-3 bg-slate-700/50 backdrop-blur-sm text-slate-100 placeholder-slate-400 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all resize-none"
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim()}
                  className={`p-3 rounded-xl transition-all transform backdrop-blur-sm border ${
                    inputValue.trim()
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:scale-110 shadow-lg hover:shadow-purple-500/25 border-blue-500/20"
                      : "bg-slate-600/50 text-slate-400 cursor-not-allowed border-slate-500/30"
                  }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}