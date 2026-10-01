import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ChatBot.css";

// ─── Intent Detection ─────────────────────────────────────────────────────────
const PRODUCT_KEYWORDS = ["product", "products", "shop", "price", "buy", "purchase"];
const FRAME_KEYWORDS = ["frame", "frames", "photo frame", "wall frame"];
const ALBUM_KEYWORDS = ["album", "albums", "photo album", "scrapbook"];
const GIFT_KEYWORDS = ["gift", "gifts", "gift box", "present"];
const ORDER_KEYWORDS = ["order", "orders", "delivery", "shipping", "track"];
const CUSTOM_KEYWORDS = ["custom", "customize", "personalized", "upload photo", "print"];
const SUPPORT_KEYWORDS = ["help", "support", "contact", "question", "issue", "problem", "assist"];
const GREETING_KEYWORDS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "hii", "hai"];

function detectIntent(text) {
  const lower = text.toLowerCase().trim();
  if (GREETING_KEYWORDS.some((k) => lower === k || lower.startsWith(k + " "))) return "greeting";
  if (ORDER_KEYWORDS.some((k) => lower.includes(k))) return "orders";
  if (CUSTOM_KEYWORDS.some((k) => lower.includes(k))) return "custom";
  if (GIFT_KEYWORDS.some((k) => lower.includes(k))) return "gifts";
  if (ALBUM_KEYWORDS.some((k) => lower.includes(k))) return "albums";
  if (FRAME_KEYWORDS.some((k) => lower.includes(k))) return "frames";
  if (PRODUCT_KEYWORDS.some((k) => lower.includes(k))) return "products";
  if (SUPPORT_KEYWORDS.some((k) => lower.includes(k))) return "support";
  return "unknown";
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: "Shop Products", message: "Show me the products",
    color: "#f97316", bg: "rgba(249,115,22,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: "Photo Frames", message: "Show me photo frames",
    color: "#3b82f6", bg: "rgba(59,130,246,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  },
  {
    label: "Albums", message: "Show me photo albums",
    color: "#f59e0b", bg: "rgba(245,158,11,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    label: "Gift Boxes", message: "Show me gift boxes",
    color: "#10b981", bg: "rgba(16,185,129,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    label: "Custom Frame", message: "How do I customize a frame?",
    color: "#8b5cf6", bg: "rgba(139,92,246,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    label: "My Orders", message: "I need help with my order",
    color: "#ec4899", bg: "rgba(236,72,153,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  },
  {
    label: "Contact Us", message: "How can I contact you?",
    color: "#06b6d4", bg: "rgba(6,182,212,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    label: "Delivery Help", message: "Tell me about delivery",
    color: "#ef4444", bg: "rgba(239,68,68,0.15)",
    icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6.29 6.29l1.64-1.64a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  },
];

// ─── Intent Responses ─────────────────────────────────────────────────────────
function getBotResponse(intent, text) {
  switch (intent) {
    case "greeting":
      return {
        type: "text",
        text: `👋 Welcome to **Q Frame Studio**! I'm here to help you choose the perfect frame, album, or gift box.\n\nYou can also ask about custom designs, photo uploads, orders, and delivery.\n\nHow can I help you today?`,
      };
    case "products":
      return {
        type: "info_cards",
        text: "🛍️ Explore our **Products**:",
        cards: [
          { icon: "🛒", title: "Shop All", desc: "Browse frames, prints, and more", link: "/shop", color: "#f97316" },
          { icon: "🖼️", title: "Photo Frames", desc: "Find a frame for every memory", link: "/frames", color: "#3b82f6" },
          { icon: "📚", title: "Photo Albums", desc: "Explore albums for your special moments", link: "/albums", color: "#8b5cf6" },
          { icon: "🎁", title: "Gift Boxes", desc: "Choose a thoughtful ready-to-give set", link: "/gifts", color: "#10b981" },
        ],
      };
    case "frames":
      return {
        type: "info_cards",
        text: "🖼️ Find the right **Photo Frame**:",
        cards: [
          { icon: "🛍️", title: "Browse Frames", desc: "See the complete frame collection", link: "/frames", color: "#3b82f6" },
          { icon: "✨", title: "Custom Frame", desc: "Create a frame with your own photo", link: "/custom-frame", color: "#f97316" },
        ],
      };
    case "albums":
      return {
        type: "info_cards",
        text: "📚 Browse our **Photo Albums**:",
        cards: [
          { icon: "📚", title: "View Albums", desc: "Shop albums for photos and memories", link: "/albums", color: "#8b5cf6" },
          { icon: "🖼️", title: "Customer Gallery", desc: "See memories framed by our customers", link: "/gallery", color: "#3b82f6" },
        ],
      };
    case "gifts":
      return {
        type: "info_cards",
        text: "🎁 Explore our **Gift Boxes**:",
        cards: [
          { icon: "🎁", title: "Shop Gift Boxes", desc: "Find a ready-to-give gift set", link: "/gifts", color: "#f97316" },
          { icon: "💝", title: "Personalized Gifts", desc: "Make your gift feel truly special", link: "/gifts", color: "#ec4899" },
        ],
      };
    case "custom":
      return {
        type: "info_cards",
        text: "✨ Create something personal with a **Custom Frame**:",
        cards: [
          { icon: "📸", title: "Upload Your Photo", desc: "Start designing with your favorite image", link: "/custom-frame", color: "#f97316" },
          { icon: "🖼️", title: "Choose a Frame", desc: "Select a style, size, and finish", link: "/custom-frame", color: "#3b82f6" },
        ],
      };
    case "orders":
      return {
        type: "info_cards",
        text: "📦 For **Orders and Delivery**:",
        cards: [
          { icon: "👤", title: "My Account", desc: "Sign in to view your order history", link: "/account", color: "#3b82f6" },
          { icon: "🛒", title: "My Cart", desc: "Review items before checkout", link: "/cart", color: "#10b981" },
          { icon: "📞", title: "Contact Us", desc: "Ask our team about an existing order", link: "/contact", color: "#f97316" },
        ],
      };
    case "support":
      return {
        type: "support",
        text: "💬 I can help you browse the shop, customize a frame, or find order support.",
      };
    default:
      return {
        type: "text",
        text: `🤔 I can help with:\n\n• 🖼️ **Frames** and photo albums\n• 🎁 **Gift boxes**\n• ✨ **Custom frames**\n• 📦 **Orders and delivery**\n\nTry asking about one of these topics.`,
      };
  }
}

// ─── Main ChatBot Component ───────────────────────────────────────────────────
const ChatBot = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          from: "bot",
          type: "welcome",
          text: `👋 Welcome to **Q Frame Studio**! I'm here to help you choose the perfect frame, album, or gift box.\n\nYou can also ask about custom designs, photo uploads, orders, and delivery.\n\nHow can I help you today?`,
        },
      ]);
    }
  }, [isOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    const userMsg = { id: Date.now(), from: "user", type: "text", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const intent = detectIntent(text);
      const response = getBotResponse(intent, text);
      const botMsg = { id: Date.now() + 1, from: "bot", ...response };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chatbot-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chatbot-panel">
        {/* Header */}
        <div className="chatbot-header" style={{ background: "linear-gradient(135deg, #1a1b23 0%, #0d0d12 100%)", borderBottom: "1px solid rgba(249,115,22,0.2)" }}>
          <div className="chatbot-header-info">
            <div className="chatbot-avatar" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.1))", border: "1px solid rgba(249,115,22,0.4)", boxShadow: "0 0 14px rgba(249,115,22,0.2)" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f97316" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16" r="1" fill="#f97316"/>
              </svg>
            </div>
            <div>
              <div className="chatbot-header-title" style={{ color: "#fff", fontWeight: 700 }}>Q Frame Assistant</div>
              <div className="chatbot-header-status" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span className="status-dot" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }} /> Photo Shop Assistant
              </div>
            </div>
          </div>
          <button className="chatbot-close-btn" onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>✕</button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages" style={{ background: "#0d0d12" }}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} navigate={navigate} onClose={onClose} />
          ))}

          {loading && (
            <div className="chatbot-msg bot-msg">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="chatbot-quick-actions" style={{ background: "#0d0d12", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="quick-actions-label" style={{ color: "rgba(255,255,255,0.4)" }}>Quick Actions</div>
            <div className="quick-actions-grid">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  className="quick-action-chip"
                  onClick={() => handleSend(qa.message)}
                  style={{
                    "--chip-color": qa.color,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fff",
                  }}
                >
                  <span className="chip-icon" style={{ color: qa.color, background: qa.bg }}>
                    {qa.icon}
                  </span>
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="chatbot-input-area" style={{ background: "#13141c", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <input
            ref={inputRef}
            className="chatbot-input"
            placeholder="Ask about frames, gifts, orders…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button
            className="chatbot-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{ background: "linear-gradient(135deg, #f97316, #ea6a10)" }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, navigate, onClose }) => {
  if (msg.from === "user") {
    return (
      <div className="chatbot-msg user-msg">
        <div className="msg-bubble user-bubble" style={{ background: "linear-gradient(135deg, #f97316, #ea6a10)", color: "#fff" }}>
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="chatbot-msg bot-msg">
      <div className="bot-avatar-sm" style={{ fontSize: "16px" }}>🤖</div>
      <div className="bot-content">

        {/* Plain text / welcome */}
        {(msg.type === "text" || msg.type === "welcome") && (
          <div className="msg-bubble bot-bubble" style={{ background: "rgba(255,255,255,0.06)", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.08)", whiteSpace: "pre-line" }}>
            {msg.text.split("**").map((part, i) =>
              i % 2 === 1 ? <strong key={i} style={{ color: "#f97316" }}>{part}</strong> : part
            )}
          </div>
        )}

        {/* Info Cards */}
        {msg.type === "info_cards" && (
          <div>
            <div className="msg-bubble bot-bubble" style={{ background: "rgba(255,255,255,0.06)", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "10px" }}>
              {msg.text.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i} style={{ color: "#f97316" }}>{part}</strong> : part
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {msg.cards.map((card, i) => (
                <button
                  key={i}
                  onClick={() => { navigate(card.link); onClose(); }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${card.color}30`,
                    borderRadius: "12px",
                    padding: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${card.color}15`; e.currentTarget.style.borderColor = `${card.color}60`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = `${card.color}30`; }}
                >
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{card.icon}</div>
                  <div style={{ color: "#fff", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>{card.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", lineHeight: "1.3" }}>{card.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Support */}
        {msg.type === "support" && (
          <div>
            <div className="msg-bubble bot-bubble" style={{ background: "rgba(255,255,255,0.06)", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "10px" }}>
              {msg.text}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Email Admin", href: "mailto:admin@qtechx.com", color: "#f97316", icon: "📧" },
                { label: "Call Support", href: "tel:+919597293504", color: "#10b981", icon: "📞" },
                { label: "WhatsApp", href: "https://wa.me/919597293504", color: "#25d366", icon: "💬" },
                { label: "Raise Ticket", href: "/admin", color: "#8b5cf6", icon: "🎫" },
              ].map((opt) => (
                <a
                  key={opt.label}
                  href={opt.href}
                  target={opt.href.startsWith("http") ? "_blank" : "_self"}
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${opt.color}30`,
                    borderRadius: "12px",
                    padding: "10px 12px",
                    textDecoration: "none",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 500,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${opt.color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  <span style={{ fontSize: "18px" }}>{opt.icon}</span>
                  {opt.label}
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatBot;
