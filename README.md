# ChatBites
![Next.js](https://img.shields.io/badge/Next.js-000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)

![AWS](https://img.shields.io/badge/AWS-232F3E?logo=amazon-aws&logoColor=white)
![AWS Amplify](https://img.shields.io/badge/AWS%20Amplify-FF9900?logo=aws-amplify&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-FF9900?logo=amazon-aws&logoColor=white)
![Amazon DynamoDB](https://img.shields.io/badge/Amazon%20DynamoDB-4053D6?logo=amazon-dynamodb&logoColor=white)
![Amazon S3](https://img.shields.io/badge/Amazon%20S3-569A31?logo=amazon-s3&logoColor=white)
![Amazon API Gateway](https://img.shields.io/badge/Amazon%20API%20Gateway-FF4F8B?logo=amazon-api-gateway&logoColor=white)
![Amazon Route 53](https://img.shields.io/badge/Amazon%20Route%2053-232F3E?logo=amazon-route53&logoColor=white)
![AWS CDK](https://img.shields.io/badge/AWS%20Cloud%20Development%20Kit%20(CDK)-4CAF50?logo=aws-cdk&logoColor=white)

![Google Maps API](https://img.shields.io/badge/Google%20Maps%20API-4285F4?logo=google-maps&logoColor=white)


## プロジェクト概要
飲食店検索、提案サービス。

LLMに対話形式でニーズを伝えることで、指定した場所、カテゴリの飲食店を検索することができる。

LLMが自動でおすすめをピックアップしてくれるため、ユーザーは多くの検索結果を見る必要がなくなる。

## アーキテクチャ
![architecture](/public/architecture.png)

## ディレクトリ構成
```
.
├── chatbites
│   ├── src
│   │   ├── talk (LLMとの対話ページ)
│   │   ├── page.tsx (トップページ)
│   │   └── components
│   ├── chatbites.yaml (API定義書)
│   ├── package-lock.json
│   └── package.json
├── lambda
│   └── talk
│       ├── generate.py
│       └── search.py
└── lib
　  └── cdk-stack.ts
```

# バックエンド、インフラのデプロイ
```
aws sso login --profile sso-profile 
cdk deploy
```

# フロントエンド
- AWS AmplifyにおいてGithubのリポジトリを自動デプロイさせる
```
git push
```