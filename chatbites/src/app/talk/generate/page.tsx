"use client"
import { useState } from "react"

export default function HistoryList() {
  const [messages, setMessages] = useState<Array<undefined|{[key: string]: string|Array<{[key: string]: string;}>;}>>([])
  const [input, setInput] = useState("")

  const handleSubmit = async () => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_URL
    if((typeof url) === "undefined"){
      return
    }
    
    const body = JSON.stringify({"userId": "John", "messages": messages.concat([{"role": "user", "content": input}])})
    console.log("request body", body)
    const res = await fetch(url+"talk/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body
    })

    console.log("response", res)
    if (res.ok) {
      const data = await res.json() // JSONデータとしてレスポンスをパース
      setMessages(data) // パースされたデータをステートにセット
      console.log(data)
    } else {
      console.error('Failed to fetch histories:', res.status)
    }
  }

  return (
    <div>
        <ul>
          {messages.map((message, messageIndex) => {
              console.log("message", message)
              if(typeof message?.content == "string"){
                return(<p key={messageIndex}>{message.content}</p>)
              }if(typeof message?.content == "object"){
                return(message.content.map((contentPart, partIndex) => {
                  if(contentPart["type"] == "text"){
                    return(<p key={messageIndex+"-"+partIndex}>{contentPart["text"]}</p>)
                  }else{
                    return(<p key={messageIndex+"-"+partIndex}>{contentPart["type"]+" is here..."}</p>)
                  }
                }))
              }else{
                return(<></>)
              }
            })
          }
        </ul>
        <div>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="メッセージを入力してください"
          />
          <button onClick={handleSubmit}>送信</button>
        </div>
    </div>
  )
}
