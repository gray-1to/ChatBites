'use client'; // 必ず最初に記述

import { signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation'; 
import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify'
import { getCurrentUser, AuthUser } from "aws-amplify/auth";
import awsconfig from '../../../aws-exports';
Amplify.configure(awsconfig);

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null)

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/'); // ログアウト後にリダイレクト
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  useEffect(() => {
    // ログインしているユーザーのIDを取得
    getCurrentUser()
      .then(user => {
        console.log("userId", user.userId)
        setUser(user)
      })
      .catch(error => {
        console.error("Failed to get user:", error);
      });    
  }, [])


  return (
    <header className="fixed w-full bg-gray-700 p-4 flex justify-between items-center">
      <div className="text-white text-lg font-bold">
        MyApp
      </div>
      <div className='flex items-center space-x-4'>
        <span className="text-white text-lg font-bold">{(user !== null) && `${user.signInDetails?.loginId}`}</span>
        <button
          onClick={handleSignOut}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          ログアウト
        </button>        
      </div>

    </header>
  );
}

export default Header;

