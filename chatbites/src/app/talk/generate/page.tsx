"use client"
import { useState, ChangeEvent } from "react"

// 型定義
type MessageContent = {
  type: string;
  text?: string;
};

type Message = {
  role: string;
  content: string | MessageContent[];
};

export default function HistoryList() {
  // メッセージの型を定義
  const initMessages = [
    {role: "user", content: "飲食店を探している。良い場所を教えて。"},
    {role: "assistant", content: "食べたい料理や人数、場所を教えてください。"}
  ]
  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [input, setInput] = useState<string>("");

  const handleMessageSubmit = async () => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_URL;
    // const url = process.env.NEXT_PUBLIC_TALK_GENERAYE_URL
    if (typeof url === "undefined") {
      return;
    }

    const body = JSON.stringify({ userId: "John", messages: messages.concat([{ role: "user", content: input }]) });
    console.log("request body", body);
    
    const res = await fetch(url + "talk/generate", {
    // const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    console.log("response", res);
    if (res.ok) {
      const data: Message[] = await res.json(); // JSONデータとしてレスポンスをパース
      setMessages(data); // パースされたデータをステートにセット
      console.log(data);
    } else {
      console.error("Failed to fetch histories:", res.status);
    }
  };

  const handleSearch = async () => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_URL;
    if (typeof url === "undefined") {
      return;
    }

    const body = JSON.stringify({ userId: "John", messages: messages });
    console.log("request body", body);
    
    const res = await fetch(url + "talk/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    console.log("response", res);
    if (res.ok) {
      const data: Message[] = await res.json(); // JSONデータとしてレスポンスをパース
      setMessages(data); // パースされたデータをステートにセット
      console.log(data);
    } else {
      console.error("Failed to search:", res.status);
    }
  };

  return (
    <div>
      <ul>
        {messages.map((message, messageIndex) => {
          console.log("message", message);
          // contentが文字列の場合
          if (typeof message.content === "string") {
            return <p key={messageIndex}>{message.content}</p>;
          }
          // contentがオブジェクトの場合
          if (Array.isArray(message.content)) {
            return message.content.map((contentPart, partIndex) => {
              if (contentPart.type === "text") {
                return <p key={messageIndex + "-" + partIndex}>{contentPart.text}</p>;
              } else {
                return <p key={messageIndex + "-" + partIndex}>{contentPart.type} is here...</p>;
              }
            });
          }
          return <></>;
        })}
      </ul>
      <div>
        <input
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="メッセージを入力してください"
        />
        <button onClick={handleMessageSubmit}>送信</button>
        <button onClick={handleSearch}>店舗を検索</button>
      </div>
    </div>
  );
}
