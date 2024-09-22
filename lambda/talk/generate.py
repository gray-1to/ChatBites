import json

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
    except (json.JSONDecodeError, TypeError) as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Invalid JSON input'}),
        }

    # 解析されたデータを確認 (例: name と age)
    userId = body.get('userId')
    talk = body.get('talk')

    # 必須フィールドの存在を確認
    if not userId:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Missing required fields: userId'}),
        }
    if not talk:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Missing required fields: talk'}),
        }

    # レスポンスを返す
    return {
        'statusCode': 200,
        'body': json.dumps({'message': f'Hello, {userId}. Talk is {json.dumps(talk)} '}),
    }