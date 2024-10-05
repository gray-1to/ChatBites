import json
import boto3
import logging
import uuid
import time
import os
from boto3.dynamodb.conditions import Key

EXEC_UPPER_LIMIT = 10
dynamodb = boto3.client("dynamodb")
s3 = boto3.client("s3")


def init_history(userId):
    id = str(uuid.uuid4())
    DYNAMODB_HISTORY_TABLE_NAME = os.environ["DYNAMODB_HISTORY_TABLE_NAME"]
    now = int(time.time())
    item = {"id": {"S": id}, "userId": {"S": userId}, "createdAt": {"N": str(now)}}
    try:
        print("save item in init_history:", item)
        res = dynamodb.put_item(TableName=DYNAMODB_HISTORY_TABLE_NAME, Item=item)
    except Exception as e:
        print("Error:")
        print(e)
        raise e
    return id


def check_exec_upper_limit(userId):
    DYNAMODB_EXEC_TABLE_NAME = os.environ["DYNAMODB_EXEC_TABLE_NAME"]

    # 現在時刻と15分前の時刻をUnix Timeで取得
    now = int(time.time())
    fifteen_minutes_ago = now - 60 * 60 * 24

    # 範囲時間内のユーザーの実行回数を取得
    try:
        response = dynamodb.query(
            TableName=DYNAMODB_EXEC_TABLE_NAME,
            KeyConditionExpression="userId = :userId AND #createdAt BETWEEN :fifteen_minutes_ago AND :now",
            ExpressionAttributeNames={"#createdAt": "createdAt"},
            ExpressionAttributeValues={
                ":userId": {"S": userId},
                ":now": {"N": str(now)},
                ":fifteen_minutes_ago": {"N": str(fifteen_minutes_ago)},
            },
        )
        print("query res in check_exec_upper_limit", response)
        total_exec_count = response["Count"]
    except Exception as e:
        print(e)
        raise e

    print("total_exec_count", total_exec_count)
    if total_exec_count > EXEC_UPPER_LIMIT:
        return False
    else:
        return True


def put_log_to_exec_table(userId, historyId):
    try:
        DYNAMODB_EXEC_TABLE_NAME = os.environ["DYNAMODB_EXEC_TABLE_NAME"]
        id = str(uuid.uuid4())
        now = int(time.time())
        item = {
            "id": {"S": id},
            "userId": {"S": userId},
            "historyId": {"S": historyId},
            "createdAt": {"N": str(now)},
        }
        dynamodb.put_item(TableName=DYNAMODB_EXEC_TABLE_NAME, Item=item)
    except Exception as e:
        print("Error:")
        print(e)
        raise e
    return


def put_messages_to_s3(historyId, messages):
    try:
        file_contents = json.dumps(messages)
        DYNAMODB_HISTORY_BUCKET_NAME = os.environ["DYNAMODB_HISTORY_BUCKET_NAME"]
        key = historyId + ".json"
        s3.put_object(Body=file_contents, Bucket=DYNAMODB_HISTORY_BUCKET_NAME, Key=key)
    except Exception as e:
        raise e
    return


def lambda_handler(event, context):
    print("talk generate start")
    try:
        body = json.loads(event["body"])
    except (json.JSONDecodeError, TypeError) as e:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Invalid JSON input"}),
        }

    # 解析されたデータを確認 (例: name と age)
    userId = body.get("userId")
    messages = body.get("messages")

    # 必須フィールドの存在を確認
    miss_fields = []
    if not userId:
        miss_fields.append("userId")
    if not messages:
        miss_fields.append("messages")
    if len(miss_fields) > 0:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps(
                {"message": f'Missing required fields: {",".join(miss_fields)}'}
            ),
        }
    # historyIdを設定
    historyId = body.get("historyId")
    if not historyId:
        try:
            historyId = init_history(userId)
        except Exception as e:
            print(e)
            return {
                "statusCode": 500,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
                "body": json.dumps({"message": "Error in saving new talk."}),
            }

    # 実行回数チェック
    if not check_exec_upper_limit(userId):
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Exec upper limit"}),
        }

    # bedrock
    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime", region_name="ap-northeast-1"
    )

    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    system_prompt = """
    あなたは飲食店紹介AIです。
    ユーザーの食べたい料理や場所を聞き出してください。
    必ず日本語で答えてください。
    """
    max_tokens = 1000

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages,
        }
    )

    # モデルの呼び出し
    response = bedrock_runtime.invoke_model(body=body, modelId=model_id)

    # StreamingBodyを読み取る
    response_body = response["body"].read().decode("utf-8")
    response_data = json.loads(response_body)

    contents = response_data["content"]
    messages.append({"role": "assistant", "content": contents})

    # 実行記録の保存
    try:
        put_log_to_exec_table(userId, historyId)
    except Exception as e:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Saving exec error"}),
        }

    # 対話記録の保存
    try:
        put_messages_to_s3(historyId, messages)
    except Exception as e:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Saving messages error"}),
        }

    # レスポンスを返す
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(messages),
    }
