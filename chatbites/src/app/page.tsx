"use client"

export default function HomePage() {
  return (
    <div className="snap-y snap-mandatory h-screen overflow-y-scroll">
      {/* ヘッダー */}
      <section className="snap-start min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-blue-500 to-blue-400 text-center">
        <h1 className="text-6xl font-bold text-white mb-4">ChatBites</h1>
        <p className="text-2xl text-gray-200">もう飲食店検索に悩まない</p>
        <a href="/talk/generate">
          <button className="mt-6 px-10 py-5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
            利用を始める　無料
          </button>
        </a>
        <p className="mt-[50px] text-xl text-gray-200">下へスクロール</p>
      </section>

      {/* 困りごと */}
      <section className="snap-start min-h-screen flex flex-col justify-center items-center bg-gray-100 text-center">
        <h2 className="text-4xl font-semibold text-gray-800 mb-8">こんなこと困りませんか？</h2>
        <ul className="text-xl text-gray-600 space-y-6 max-w-4xl mx-auto">
          <li>サクッと軽食を食べたいけど検索キーワードが思いつかない</li>
          <li>検索結果が多すぎて全部見るのは面倒</li>
          <li>「麺類」のような食べ物のジャンルで検索したい</li>
        </ul>
      </section>

      {/* ChatBitesの機能 */}
      <section className="snap-start min-h-screen flex flex-col justify-center items-center bg-white text-center">
        <h2 className="text-4xl font-semibold text-gray-800 mb-8">ChatBitesの機能</h2>
        <p className="text-xl text-gray-600 max-w-4xl mb-12">
          ChatBitesでは、AIが対話の中からニーズを読み取り、付近の飲食店からあなたのニーズに合う店舗を厳選して提案します。
          キーワードを考える手間もなく、ヒットした店舗が多い場合は、AIが5店舗に絞って提案します。
        </p>
      </section>

      {/* 便利な機能 */}
      <section className="snap-start min-h-screen flex flex-col justify-center items-center bg-gray-100 text-center">
        <h2 className="text-4xl font-semibold text-gray-800 mb-8">便利な機能</h2>
        <ul className="text-xl text-gray-600 space-y-6 max-w-4xl mx-auto">
          <li>曖昧検索 - 食べ物のジャンルから付近の飲食店を選んでくれる</li>
          <li>検索からルート案内まで - 現在地を自動入力</li>
        </ul>
        {/* <a href="#" className="mt-6 text-blue-500 hover:text-blue-700 transition">使い方はこちら</a> */}
      </section>

      {/* 対話ページへのリンク */}
      <div className="snap-start">
        <section className=" min-h-screen flex justify-center items-center bg-gradient-to-t from-blue-500 to-blue-400">
          <a href="/talk/generate" className="text-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 px-10 py-5 rounded-lg shadow-lg">
            AIと対話を始める
          </a>
        </section>

        {/* フッター */}
        <footer className="flex flex-col justify-center items-center bg-gray-800 text-gray-400">
          <p>© 2024 ChatBites by Yuma Ito</p>
        </footer>        
      </div>

    </div>
  );
}
