"use client"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">ChatBites</h1>
        <p className="text-lg text-gray-600">AIと一緒に最適な飲食店を見つけよう</p>
      </header>
      <main className="flex flex-col items-center space-y-6">
        <div className="max-w-2xl bg-white shadow-md p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">サービス概要</h2>
          <p className="text-gray-600 mb-4">
            ChatBitesは、ご飯屋さんを決めるのに困っている人や、飲食店の曖昧検索を行いたい人向けのサービスです。検索キーワードが明確でなくても、AIとの対話を通じて曖昧なニーズを言語化し、最終的にAIが自動で飲食店の候補を提示します。
          </p>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">嬉しいポイント</h3>
          <ul className="list-disc list-inside text-gray-600 mb-4">
            <li>何度も検索をかける手間が省ける</li>
            <li>言語化が難しいニーズを検索できる</li>
            <li>いつも同じ店でご飯を食べるマンネリを防げる</li>
          </ul>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Coming Soon</h3>
          <ul className="list-disc list-inside text-gray-600">
            <li>履歴を元にした店舗のリコメンド機能</li>
            <li>実行履歴の再実行機能</li>
            <li>UIのさらなる改善</li>
          </ul>
          <div className="mt-6 text-center">
            <a href="/talk/generate" className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
              AIと対話を始める
            </a>
          </div>
        </div>
      </main>
      <footer className="mt-12 text-gray-600">
        <p>&copy; 2024 ChatBites by Yuma Ito</p>
      </footer>
    </div>
  );
}
