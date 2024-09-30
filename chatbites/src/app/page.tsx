"use client"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      {/* ヘッダー */}
      <header className="text-center py-24 bg-gradient-to-b from-blue-500 to-blue-400">
        <h1 className="text-6xl font-bold text-white mb-4">ChatBites</h1>
        <p className="text-2xl text-gray-200">AIと一緒に最適な飲食店を見つけよう</p>
      </header>

      {/* 対話ページへのリンク */}
      <section className="flex justify-center py-20 bg-gray-100 text-center">
        <a href="/talk/generate" className="text-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 px-10 py-5 rounded-lg shadow-lg">
          AIと対話を始める
        </a>
      </section>

      {/* サービスの説明 */}
      <section className="flex flex-col items-center justify-center text-center py-20 bg-white">
        <h2 className="text-4xl font-semibold text-gray-800 mb-8">ChatBitesとは？</h2>
        <p className="text-xl text-gray-600 max-w-4xl mb-12">
          ChatBitesは、検索キーワードが決まっていないユーザーでも、AIとの対話を通じて曖昧なニーズを言語化し、
          飲食店の候補を自動的に提案するサービスです。ご飯屋さんを決めるのに困っている方にピッタリです。
        </p>
        <p className="text-xl text-gray-600 max-w-4xl mb-12">
          何度も検索する手間を省き、言語化が難しいニーズもAIが代わりに理解してくれます。
          さらに、いつも同じ店に行くマンネリ化を防ぎ、あなたの食体験をより豊かにします。
        </p>
      </section>

      {/* 嬉しい点 */}
      <section className="py-20 bg-gray-100 text-center">
        <h2 className="text-4xl font-semibold text-gray-800 mb-8">ChatBitesの嬉しい点</h2>
        <ul className="text-xl text-gray-600 space-y-6 max-w-4xl mx-auto">
          <li>🔍 何度も検索をかける手間が省ける</li>
          <li>💡 言語化が難しいニーズでも検索できる</li>
          <li>🍽 いつも同じ店でご飯を食べるマンネリ化を防げる</li>
        </ul>
      </section>

      {/* Comming Soon */}
      <section className="py-20 bg-white text-center">
        <h2 className="text-4xl font-semibold text-gray-800 mb-8">Comming Soon</h2>
        <ul className="text-xl text-gray-600 space-y-6 max-w-4xl mx-auto">
          <li>📊 履歴を元にした店舗のリコメンド</li>
          <li>🔄 実行履歴の再実行</li>
          <li>🎨 UIの改善</li>
        </ul>
      </section>

      {/* 対話ページへのリンク */}
      <section className="flex justify-center py-20 bg-gradient-to-t from-blue-500 to-blue-400">
        <a href="/talk/generate" className="text-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 px-10 py-5 rounded-lg shadow-lg">
          AIと対話を始める
        </a>
      </section>

      {/* フッター */}
      <footer className="py-12 text-center bg-gray-800 text-gray-400">
        <p>© 2024 ChatBites by Yuma Ito</p>
      </footer>
    </div>
  );
}
