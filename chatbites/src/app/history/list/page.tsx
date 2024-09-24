"use client"
import { useEffect, useState } from "react"


export default function HistoryList() {
  const [histories, setHistories] = useState([])

  useEffect(() => {
    const getHistories = async () => {
      const url = process.env.GATEWAY_URL ?? "a"
      // const res = await fetch(url+"history/list")
      console.log(url+"history/list")
      const res = await fetch("https://obhady3gdk.execute-api.ap-northeast-1.amazonaws.com/prod/history/list")

      if (res.ok) {
        const data = await res.json() // JSONデータとしてレスポンスをパース
        setHistories(data) // パースされたデータをステートにセット
        console.log(data)
      } else {
        console.error('Failed to fetch histories:', res.status)
      }
    }

    getHistories()
  }, [])

  return (
    <ul>
      {histories.map((history, index) => {
          return(
            <li key={index}>{history.initContent[1]["content"]} {history.updatedAt}</li>
          )
        })
      }
    </ul>
  )
}
