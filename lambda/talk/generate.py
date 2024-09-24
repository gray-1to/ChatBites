import json
import boto3
import logging
logger = logging.getLogger()
logger.setLevel("INFO")

def lambda_handler(event, context):
    logger.info("talk/generate start")
    logger.info(f"event: {event}")
    try:
        body = json.loads(event['body'])
        logger.info(f"body: {body}")
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

    # 必須フィールドの存在を確認
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
                "Access-Control-Allow-Methods": "GET",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            'body': json.dumps({'message': f'Missing required fields: {",".join(miss_fields)}'}),
        }

    # bedrock
    bedrock_runtime = boto3.client(service_name='bedrock-runtime', region_name='ap-northeast-1')

    model_id = 'anthropic.claude-3-5-sonnet-20240620-v1:0'
    system_prompt = "必ず日本語で答えてください"
    max_tokens = 1000
    
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages
        }
    )

    # モデルの呼び出し
    response = bedrock_runtime.invoke_model(body=body, modelId=model_id)

    # StreamingBodyを読み取る
    response_body = response['body'].read().decode('utf-8')
    response_data = json.loads(response_body)
    
    contents = response_data["content"]
    messages.append({"role": "assistant", "content": contents})

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