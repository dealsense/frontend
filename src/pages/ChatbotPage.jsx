import { useState } from "react";

const ChatbotPage = () => {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hello! I’m your AI Analyst. Ask me anything!" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", text: input }]);
    setInput("");
    // Mock AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Interesting! Let me analyze that..." },
      ]);
    }, 1000);
  };

  return (
    <div className="p-8 flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 my-1 rounded-lg ${
              msg.role === "bot"
                ? "bg-gray-200 text-black self-start"
                : "bg-indigo-600 text-white self-end"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          className="flex-1 border rounded-l px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
        />
        <button
          onClick={sendMessage}
          className="bg-indigo-600 text-white px-4 rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotPage;
