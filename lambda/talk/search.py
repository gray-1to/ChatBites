import json
import boto3
import logging
import uuid
import time
import os
import requests
import re
from concurrent.futures import ThreadPoolExecutor


EXEC_UPPER_LIMIT = 2
dynamodb = boto3.client("dynamodb")
s3 = boto3.client("s3")
GOOGLE_MAP_API_KEY = os.environ["GOOGLE_MAP_API_KEY"]
RECOMMEND_RESTAURANT_NUM = 5
DEMO_USERID = os.environ["DEMO_USERID"]

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
    # デモユーザーは上限判定をしない
    if userId == DEMO_USERID:
        return True
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


def get_lat_lon(location):
    # google map API
    query = json.dumps({"textQuery": location, "languageCode": "ja"})
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAP_API_KEY,
        "X-Goog-FieldMask": "places.location",
    }
    try:
        res = requests.post(url, headers=headers, data=query)
    except Exception as e:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Error in search map"}),
        }
    place = res.json()["places"][0]
    return (place["location"]["latitude"], place["location"]["longitude"])


def get_restaurant_categories(food):
    print("food in get_restaurant_categories", food)
    # bedrock
    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime", region_name="ap-northeast-1"
    )

    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    system_prompt = """
# 指示
あなたは料理を扱う飲食店の提案を行うAIです。
「甘いもの」や「丼もの」のようなキーワードが渡されます。
キーワードに対して「ケーキ屋」や「牛丼屋」のようなキーワードの料理を扱う飲食店を複数回答してください。

# 制約
回答する飲食店名は5つまでにしてください。
なるべく多様な飲食店にしてください。
日本で一般的な飲食店にしてください。

# 出力形式
カンマ区切りで料理名だけを答えてください。
牛丼屋,親子丼屋,うな重
"""
    
    messages =  [
        {"role": "user",
         "content": "甘いもの"},
        {"role": "assistant",
         "content": "ケーキ屋,クレープ屋,和菓子屋,チョコレート専門店,パフェ専門店"},
        {"role": "user",
         "content": "軽食"},
        {"role": "assistant",
         "content": "カフェ,ベーカリー,ホットドッグ屋,ハンバーガーショップ,コンビニ"},
         
    ]

    max_tokens = 100 
    messages.append(
        {
            "role": "user",
            "content": food
        }
    )

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages,
        }
    )

    # モデルの呼び出し
    try:
        response = bedrock_runtime.invoke_model(body=body, modelId=model_id)
    except Exception as e:
        print(e)
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Error in invoke model"}),
        }

    # StreamingBodyを読み取る
    response_body = response["body"].read().decode("utf-8")
    response_data = json.loads(response_body)
    output = response_data["content"][0]["text"]
    print("restaurant category: ", output)
    try:
        print(output)
        restaurant_categories = output.split(",")
    except e:
        print(e)
        print(output)
        restaurant_categories = ["コンビニ", "ファミレス"]
    return restaurant_categories


def get_restaurants(lat, lon, food, maxResultCount):
    # 緯度経度からNearbySearchで近辺の飲食店を取得
    radius = 1500
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAP_API_KEY,
        "X-Goog-FieldMask": "*",
    }
    query = json.dumps({
        "textQuery": food,
        "maxResultCount": maxResultCount,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": lat,
                    "longitude": lon
                },
                "radius": 1500.0
            }
        },
        "languageCode": "ja"
    })
    try:
        res = requests.post(url, headers=headers, data=query)
    except Exception as e:
        print(e)
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Error in getting restaurants"}),
        }
    restaurants = res.json()["places"]
    restaurants = list(filter(lambda restaurant: restaurant.get('currentOpeningHours').get('openNow') if restaurant.get('currentOpeningHours') else False, restaurants))
    print("restaurant num", len(restaurants))
    return restaurants


def get_condition_from_messages(messages):
    # 対話からレストランに求める条件をLLMで出力
    # bedrock
    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime", region_name="ap-northeast-1"
    )

    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    system_prompt = """
    あなたは飲食店の検索用AIです。
    ユーザーが求めているニーズを聞き出します。
    端的に回答してください。
    必ず日本語で答えてください。
    """
    max_tokens = 1000
    search_word_direction = [
        {
            "role": "user",
            "content": """
            これまでの情報から私が飲食店に求めている条件を答えてください。
            条件を箇条書きで回答してください。
            各箇条書きの項目は端的に回答してください。
            未指定やわからない項目は回答しないでください。
            条件のみを回答してください。
            条件がない場合はなしと回答してください。
            """,
        }
    ]

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages + search_word_direction,
        }
    )

    # モデルの呼び出し
    try:
        response = bedrock_runtime.invoke_model(body=body, modelId=model_id)
    except Exception as e:
        print(e)
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Error in invoke model"}),
        }

    # StreamingBodyを読み取る
    response_body = response["body"].read().decode("utf-8")
    response_data = json.loads(response_body)
    output = response_data["content"][0]["text"]
    print("condition: ", output)
    return output

def ask_llm(restaurant_info, needs):
    # bedrock
    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime", region_name="ap-northeast-1"
    )

    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    system_prompt = """
# 指示
飲食店の情報とユーザーのニーズから飲食店のおすすめ度を10段階で評価してください。
評価は1-10の整数で厳し目に行って下さい。
10が最もニーズに合い、1が最もおすすめできないという評価です。
評価の数字だけを答えてください。


# 評価基準
- ユーザーのニーズにあっていると高評価
- お店の評価が高いと高評価

"""
    
    input_format=  """
# 飲食店の情報
{restaurant_info}

# ユーザーのニーズ
{needs}


# 出力形式
評価の数字だけを答えてください。
"""

    max_tokens = 1000
    messages = [
        {
            "role": "user",
            "content": input_format.replace("{restaurant_info}", restaurant_info) \
                                      .replace("{needs}", needs) ,
        }
    ]

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": messages,
        }
    )

    # モデルの呼び出し
    try:
        response = bedrock_runtime.invoke_model(body=body, modelId=model_id)
    except Exception as e:
        print(e)
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"message": "Error in invoke model"}),
        }

    # StreamingBodyを読み取る
    response_body = response["body"].read().decode("utf-8")
    response_data = json.loads(response_body)
    output = response_data["content"][0]["text"]
    print("recommend level: ", output)
    try:
        int_output = int(output)
    except ValueError:
        int_output = 0
    return int_output

def rerank(restaurants: list, restaurant_condition: str):
    # 飲食店を条件に合わせてスコアリングし並び替える
    restaurant_infos = []
    for restaurant in restaurants:
        restaurant_info = f"""
飲食店名：{restaurant['displayName']['text']}
属性：{', '.join(restaurant['types'])}
評価(5が最高)：{restaurant['rating']}
"""
        restaurant_infos.append(restaurant_info)


    try:
        print("Invoking LLM chain")
        with ThreadPoolExecutor() as executor:
            tasks = list(map(lambda restaurant_info: executor.submit(ask_llm, restaurant_info, restaurant_condition), restaurant_infos))
            scores = [task.result() for task in tasks]
        print("LLM chain invoked successfully")
        print(f"LLM response: {', '.join(str(scores))}")
    except Exception as e:
        print(f"Error invoking LLM: {str(e)}")
        raise

    restaurant_score_pairs = zip(restaurants, scores)
    sorted_restaurant_score_pairs = sorted(
        restaurant_score_pairs, key=lambda pair: (pair[1], float(pair[0]['rating'])), reverse=True
    )
    top_restaurant_score_pairs = sorted_restaurant_score_pairs[:RECOMMEND_RESTAURANT_NUM]

    return top_restaurant_score_pairs


def lambda_handler(event, context):
    print("talk/search start")
    print(f"event: {event}")
    try:
        body = json.loads(event["body"])
        print(f"body: {body}")
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

    # データを確認
    userId = body.get("userId")
    messages = body.get("messages")
    location = body.get("location")
    locationLatLng = body.get("locationLatLng")
    isCurrentLocationLatLng = body.get("isCurrentLocationLatLng")
    food = body.get("food")
    isFuzzyFoodSearch = body.get("isFuzzyFoodSearch")

    # # 必須フィールドの存在を確認
    miss_fields = []
    if not userId:
        miss_fields.append("userId")
    if not messages:
        miss_fields.append("messages")
    if not location:
        miss_fields.append("location")
    if not location:
        miss_fields.append("locationLatLng")
    if not location:
        miss_fields.append("isCurrentLocationLatLng")
    if not food:
        miss_fields.append("food")
    if not isFuzzyFoodSearch:
        miss_fields.append("isFuzzyFoodSearch")
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

    # 現在地を緯度経度に
    if bool(isCurrentLocationLatLng):
        lat, lng = locationLatLng["lat"], locationLatLng["lng"]
    else:
        lat, lng = get_lat_lon(location)
    print("lat_lon", lat, lng)

    # 飲食店を検索
    if bool(isFuzzyFoodSearch):
        print("fuzzy true")
        restaurant_categories = get_restaurant_categories(food)
        
        print("restaurant_categories", restaurant_categories)
        restaurants = []
        for restaurant_category in restaurant_categories:
            restaurants.extend(get_restaurants(lat, lng, restaurant_category, RECOMMEND_RESTAURANT_NUM/len(restaurant_categories) + 1))
    else:
        print("fuzzy false")
        restaurants = get_restaurants(lat, lng, food, RECOMMEND_RESTAURANT_NUM)

    restaurant_condition = get_condition_from_messages(messages)

    top_restaurant_score_pairs = rerank(restaurants, restaurant_condition)

    messages.append({"role": "user", "content": "条件に合うお店を教えて。"})
    restaurants_proposal_message = "以下の店舗をお勧めします。\n" + "\n".join(
        [top_restaurant_score_pair[0]['displayName']['text'] for top_restaurant_score_pair in top_restaurant_score_pairs]
    )
    messages.append({"role": "assistant", "content": restaurants_proposal_message})
    print("answer", restaurants_proposal_message)
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
    
    recommendations_data = [{"displayName": top_restaurant_score_pair[0]["displayName"]["text"],
                             "googleMapsUri": top_restaurant_score_pair[0]["googleMapsUri"],
                             "location": {
                                "lat": top_restaurant_score_pair[0]["location"]["latitude"],
                                "lng": top_restaurant_score_pair[0]["location"]["longitude"]}
                                }
                             for top_restaurant_score_pair in top_restaurant_score_pairs]
    
    body = {
        "messages": messages,
        "recommendations": recommendations_data,
        "userLocation": {
            "lat": lat,
            "lng": lng
        }
    }
    
    try:
        body_str = json.dumps(body)
    except e:
        print(e)
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "result json error",
        }

    # レスポンスを返す
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": body_str,
    }

