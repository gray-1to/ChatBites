'use client'; // 必ず最初に記述

import { signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation'; 

function Header() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/'); // ログアウト後にリダイレクト
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  return (
    <header className="fixed w-full bg-gray-700 p-4 flex justify-between items-center">
      <div className="text-white text-lg font-bold">
        MyApp
      </div>
      <button
        onClick={handleSignOut}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
      >
        ログアウト
      </button>
    </header>
  );
}

export default Header;

