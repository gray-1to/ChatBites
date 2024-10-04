"use client"
import { useState, ChangeEvent } from "react"
import { withAuthenticator } from "@aws-amplify/ui-react";
import { Amplify } from 'aws-amplify'
import { getCurrentUser } from "aws-amplify/auth";
import awsconfig from '../../../../aws-exports'; // aws-exports.jsへのパスを指定
Amplify.configure(awsconfig);


// 型定義
type MessageContent = {
  type: string;
  text?: string;
};

type Message = {
  role: string;
  content: string | MessageContent[];
};
function HistoryList() {
  // メッセージの型を定義
  const initMessages = [
    {role: "user", content: "飲食店を探している。良い場所を教えて。"},
    {role: "assistant", content: "食べたい料理や人数、場所を教えてください。"}
  ]
  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [input, setInput] = useState<string>("");

  const handleMessageSubmit = async () => {
    // ログインしているユーザーのIDを取得
    getCurrentUser()
      .then(user => {
        console.log("userId", user.userId)
        sendMessageSubmit(user.userId)
      })
      .catch(error => {
        console.error("Failed to get user:", error);
      });
  }
  
  const sendMessageSubmit = async (userId: string) => {

    const url = process.env.NEXT_PUBLIC_GATEWAY_URL;
    if (typeof url === "undefined") {
      return;
    }

    const body = JSON.stringify({ userId: userId, messages: messages.concat([{ role: "user", content: input }]) });
    console.log("request body", body);
    
    const res = await fetch(url + "talk/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    console.log("response", res);
    if (res.ok) {
      const data: Message[] = await res.json();
      setMessages(data);
      console.log(data);
      setInput("")
    } else {
      console.error("Failed to fetch histories:", res.status);
    }
  };

  const handleSearch = async () => {
    // ログインしているユーザーのIDを取得
    getCurrentUser()
      .then(user => {
        console.log("userId", user.userId)
        sendSearch(user.userId)
      })
      .catch(error => {
        console.error("Failed to get user:", error);
      });
  }

  const sendSearch = async (userId: string) => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_URL;
    if (typeof url === "undefined") {
      return;
    }

    const body = JSON.stringify({ userId: userId, messages: messages });
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
      const data: Message[] = await res.json();
      setMessages(data);
      console.log(data);
      setInput("")
    } else {
      console.error("Failed to search:", res.status);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col justify-between">
      <div className="flex flex-col space-y-4 overflow-y-auto">
        {messages.map((message, messageIndex) => (
          <div
            key={messageIndex}
            className={`p-4 rounded-lg max-w-lg ${
              message.role === "user" ? "bg-blue-500 text-white self-end" : "bg-gray-200 text-black self-start"
            }`}
          >
            {typeof message.content === "string"
              ? <p>{message.content}</p>
              : message.content.map((contentPart, partIndex) =>
                contentPart.type === "text"
                  ? <p key={messageIndex + "-" + partIndex}>{contentPart.text}</p>
                  : <p key={messageIndex + "-" + partIndex}>{contentPart.type} is here...</p>
              )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="メッセージを入力してください"
          className="flex-1 p-2 border border-gray-300 rounded-lg"
        />
        <button
          onClick={handleMessageSubmit}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          送信
        </button>
        <button
          onClick={handleSearch}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          店舗を検索
        </button>
      </div>
    </div>
  );
}

export default withAuthenticator(HistoryList)