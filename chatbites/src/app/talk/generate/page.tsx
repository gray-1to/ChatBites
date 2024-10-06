"use client"
import { useState, ChangeEvent } from "react"
import { withAuthenticator } from "@aws-amplify/ui-react";
import { Amplify } from 'aws-amplify'
import { getCurrentUser } from "aws-amplify/auth";
import awsconfig from '../../../../aws-exports'; // aws-exports.jsへのパスを指定
import MapModal from '../../components/MapModal';
import Header from "@/app/components/Header";
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

type LatLng = {
  lat: number,
  lng: number
}

type SubmitResponse = {
  messages: Message[] | string;
}

type SearchResponse = {
  messages: Message[] | string;
  recommendations: Recommendation[];
  userLocation: LatLng
}

type Recommendation = {
  displayName: string;
  googleMapsUri: string;
  location: LatLng
}

function TalkGenerate() {
  // メッセージの型を定義
  const initMessages = [
    { role: "user", content: "飲食店を探している。良い場所を教えて。" },
    { role: "assistant", content: "場所や食べたい料理、人数や予算を教えてください。" }
  ];

  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [input, setInput] = useState<string>("");
  const [location, setLocation] = useState<string>("");  // 追加: 場所入力用
  const [food, setFood] = useState<string>("");          // 追加: 食べ物入力用
  const [isFuzzyFoodSearch, setIsFuzzyFoodSearch] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [recommendationIndex, setRecommendationIndex] = useState<number | null>(null)
  const [recommendations, setRecommendations] = useState<{[name: string]: Recommendation[]}>({})
  const [locationLatLng, setLocationLatLng] = useState<LatLng>({lat: 0, lng: 0})
  const [isCurrentLocationLatLng, setIsCurrentLocationLatLng] = useState<boolean>(false)
  const [formErrorMessage, setFormErrorMessage] = useState<string|null>(null)

  const handleCurrentLocation = () => {
  // 位置情報を取得して設定する関数
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocationLatLng({ lat: latitude, lng: longitude });
          setIsCurrentLocationLatLng(true)
          setLocation("現在地");
          console.log({ lat: latitude, lng: longitude })
        },
        (error) => {
          setIsCurrentLocationLatLng(false)
          console.error("Error retrieving location", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setFormErrorMessage("位置情報の自動取得に失敗しました。")
    }
  }

  const handleMessageSubmit = async () => {
    // ログインしているユーザーのIDを取得
    getCurrentUser()
      .then(user => {
        console.log("userId", user.userId)
        sendMessageSubmit(user.userId)
      })
      .catch(error => {
        console.error("Failed to get user:", error);
        setFormErrorMessage("ユーザーの取得に失敗しました。")
      });
  }

  const sendMessageSubmit = async (userId: string) => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_URL;
    if (typeof url === "undefined") {
      return;
    }

    const body = JSON.stringify({ 
      userId: userId, 
      messages: messages.concat([{ role: "user", content: input }]),
      location: location,  // 追加: 場所データを含む
      food: food           // 追加: 食べ物データを含む
    });
    console.log("request body", body);

    setMessages([...messages, { role: "user", content: input }, { role: "assistant", content: "Loading..." }])

    const res = await fetch(url + "talk/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    console.log("response", res);
    if (res.ok) {
      const data: SubmitResponse = await res.json();
      if (res.status == 200){
        if (typeof data["messages"] === "string"){
          setFormErrorMessage("API接続失敗")
          return
        }
        setMessages(data["messages"]);
        setInput("");
      }else{
        if (typeof data["messages"] === "object"){
          setFormErrorMessage("API接続失敗")
          return
        }
        setFormErrorMessage(data["messages"])
      }
    } else {
      setFormErrorMessage("API接続失敗")
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
        setFormErrorMessage("ユーザーの取得に失敗しました。")
      });
  }

  const sendSearch = async (userId: string) => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_URL;
    if (typeof url === "undefined") {
      return;
    }

    const body = JSON.stringify({ 
      userId: userId, 
      messages: messages,
      location: location,  // 追加: 場所データを含む
      locationLatLng: locationLatLng,
      isCurrentLocationLatLng: isCurrentLocationLatLng,
      food: food,           // 追加: 食べ物データを含む
      isFuzzyFoodSearch: isFuzzyFoodSearch,
    });
    console.log("request body", body);

    setMessages([...messages, 
                  {"role": "user", "content": "条件に合うお店を教えて。"},
                  {"role": "assistant", "content": "Loading..."},
                ])
    const res = await fetch(url + "talk/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    const data: SearchResponse = await res.json();
    console.log("response json", data);
    if (res.ok) {
      if (res.status == 200){
        if (typeof data["messages"] === "string"){
          setFormErrorMessage("API接続失敗")
          return
        }
        setMessages(data["messages"]);
        setInput("");
        setRecommendations(pre => {
          const message_index = data["messages"].length - 1
          return{
          ...pre,
          [message_index.toString()]: data["recommendations"]
        }});
        setLocationLatLng(data["userLocation"])
        setRecommendationIndex(data["messages"].length - 1)
        setIsModalOpen(true);        
      }else{
        if (typeof data["messages"] === "object"){
          setFormErrorMessage("API接続失敗")
          return
        }
        setFormErrorMessage(data["messages"])
      }
    } else {
      setFormErrorMessage("API接続失敗")
      console.error("Failed to search:", res.status);
    }
  };

  return (
    <div>
      <Header/>
      <MapModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => setIsModalOpen(false)}
        recommendations={recommendationIndex !== null ? recommendations[recommendationIndex] : []}
        center={locationLatLng}
      />
      <div className="min-h-screen bg-gray-100 p-6 pt-[100px] flex flex-col justify-between">
        <div className="flex flex-col space-y-4 overflow-y-auto">
          {messages.map((message, messageIndex) => (
            <div
              key={messageIndex}
              className={`p-4 rounded-lg max-w-lg ${
                message.role === "user" ? "bg-blue-500 text-white self-end" : "bg-gray-200 text-black self-start"
              }`}
            >
              <>
              {typeof message.content === "string"
                ? <p>{message.content}</p>
                : message.content.map((contentPart, partIndex) =>
                  contentPart.type === "text"
                    ? <p key={messageIndex + "-" + partIndex}>{contentPart.text}</p>
                    : <p key={messageIndex + "-" + partIndex}>{contentPart.type} is here...</p>
                )}
              {((Object.keys(recommendations) !== undefined ) && (Object.keys(recommendations).includes(messageIndex.toString())))
                ?
                  <div className="flex flex-col items-center justify-center">
                    <button
                      className="bg-slate-900 hover:bg-slate-700 text-white text-lg w-60 h-14 py-2 px-4"
                      onClick={() => {
                        setIsModalOpen(true)
                        setRecommendationIndex(messageIndex)
                      }}
                    >
                      Open Map
                    </button>
                  </div>
                : <></>
              }
              </>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col space-y-2">
          <span className="text-red-500 text-lg font-bold mx-auto">{(formErrorMessage !== null) && formErrorMessage}</span>
          <div className="mt-4 flex space-x-2">
            <input
              type="text"
              value={location}   // 場所入力
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setIsCurrentLocationLatLng(false)
                setLocation(e.target.value)
              }}
              placeholder="場所を入力してください"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleCurrentLocation}
              className="whitespace-nowrap bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              現在地
            </button>
          </div>
          <div className="mt-4 flex space-x-2">
            <input
              type="text"
              value={food}       // 食べ物入力
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFood(e.target.value)}
              placeholder="食べ物を入力してください"
              className="p-2 w-full border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => setIsFuzzyFoodSearch(!isFuzzyFoodSearch)}
              className={`whitespace-nowrap ${isFuzzyFoodSearch ? "bg-blue-500 hover:bg-blue-600" : "bg-blue-200 hover:bg-blue-300"} text-white px-4 py-2 rounded-lg`}
            >
              曖昧検索 {isFuzzyFoodSearch ? "ON " : "OFF"}
            </button>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              placeholder="メッセージを入力してください"
              className="w-full flex-1 p-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleMessageSubmit}
              className="whitespace-nowrap bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              送信
            </button>
            <button
              onClick={handleSearch}
              className="whitespace-nowrap bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              店舗を検索
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuthenticator(TalkGenerate);


