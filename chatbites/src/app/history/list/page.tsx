"use client"
import { useEffect, useState } from "react"

// 型定義
type History = {
  initContent: { [key: string]: string }[]; // 任意のキーで、文字列のコンテンツを持つ配列
  updatedAt: string; // 更新日時
};

export default function HistoryList() {
  const [histories, setHistories] = useState<History[]>([]); // History型の配列

  useEffect(() => {
    const getHistories = async () => {
      const url = process.env.NEXT_PUBLIC_GATEWAY_URL; // 環境変数の修正
      if (typeof url === "undefined") {
        return;
      }
      const res = await fetch(url + "history/list");

      if (res.ok) {
        const data: History[] = await res.json(); // JSONデータをHistory型配列としてパース
        setHistories(data); // パースされたデータをステートにセット
        console.log(data);
      } else {
        console.error("Failed to fetch histories:", res.status);
      }
    };

    getHistories();
  }, []);

  return (
    <ul>
      {histories.map((history, index) => {
        return (
          <li key={index}>
            {history.initContent[1]?.content} {history.updatedAt}
          </li>
        );
      })}
    </ul>
  );
}
