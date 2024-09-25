import json
import boto3
import os
import requests
import re

def lambda_handler(event, context):
    print("talk/search start")
    print(f"event: {event}")
    try:
        body = json.loads(event['body'])
        print(f"body: {body}")
    except (json.JSONDecodeError, TypeError) as e:
        return {
            'statusCode': 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            'body': json.dumps({'message': 'Invalid JSON input'}),
        }

    # 解析されたデータを確認 (例: name と age)
    userId = body.get('userId')
    messages = body.get('messages')

    # # 必須フィールドの存在を確認
    miss_fields = []
    if not userId:
        miss_fields.append("userId")
    if not messages:
        miss_fields.append("messages")
    if len(miss_fields) > 0:
        return {
            'statusCode': 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            'body': json.dumps({'message': f'Missing required fields: {",".join(miss_fields)}'}),
        }
    
    # messages = [{"role":"user","content":"飲食店を探している。良い場所を教えて。"},
    # {"role":"assistant","content":"食べたい料理や場所を教えてください。"},
    # {"role":"user","content":"東京駅で探してる"},
    # {"role":"assistant","content":"食べたい料理はなんですか"},
    # {"role":"user","content":"ラーメン"},
    # {"role":"assistant","content":"何人ですか？"},
    # ]

    # bedrock
    bedrock_runtime = boto3.client(service_name='bedrock-runtime', region_name='ap-northeast-1')

    model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'
    system_prompt = """
    あなたは飲食店紹介AIです。
    ユーザーの食べたい料理や場所を聞き出してください。
    必ず日本語で答えてください。
    """
    max_tokens = 1000
    search_word_direction = [{"role": "user", "content": "これまでの情報から検索ワードを考えてください。検索ワードは<< >>で囲ってください。"}]
    
    pattern = r'<<(.*?)>>'
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages+search_word_direction
        }
    )

    # モデルの呼び出し
    try:
        response = bedrock_runtime.invoke_model(body=body, modelId=model_id)
    except Exception as e:
        return {
            'statusCode': 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            'body': json.dumps({'message': 'Error in invoke model'}),
        }

    # StreamingBodyを読み取る
    response_body = response['body'].read().decode('utf-8')
    response_data = json.loads(response_body)
    output = response_data["content"][0]["text"]
    textQuery = " ".join(re.findall(pattern, output))

    # google map API
    GOOGLE_MAP_API_KEY = os.environ["GOOGLE_MAP_API_KEY"]
    query = json.dumps({"textQuery": textQuery, "languageCode": "ja"})
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAP_API_KEY,
        'X-Goog-FieldMask': 'places.displayName',
    }
    try:
        res = requests.post(url, headers=headers, data=query)
    except Exception as e:
        return {
            'statusCode': 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            'body': json.dumps({'message': 'Error in search map'}),
        }
    places = res.json()["places"]
    names = [result["displayName"]["text"] for result in places[:3]]

    messages.extend([
        {"role": "user", "content": "これまでの情報から店舗を調べて。"},
        {"role": "assistant", "content": ", ".join(names)+"が検索にヒットしました。これらの店舗はどうでしょうか。"}
    ])

    # レスポンスを返す
    return {
        'statusCode': 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        'body': json.dumps(messages),
    }