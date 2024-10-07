const awsconfig = {
  aws_project_region: 'ap-northeast-1',  // 使っているリージョンに置き換えてください
  aws_cognito_region: 'ap-northeast-1',
  aws_user_pools_id: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
};

export default awsconfig;
