import json
from randomq import generate_random_questions
from double_string_parsing import remove_extra_string_layers


def lambda_handler(event, context):
    try:
        qs = event.get("queryStringParameters") or {}

        count = int(qs["count"]) if "count" in qs else None
        difficulty = qs.get("difficulty")

        # If count is None, or any parameter is not provided, the function's defaults will apply.
        questions = generate_random_questions(
            count=count if count is not None else 7,
            difficulty=(
                difficulty if difficulty is not None else "introductory"
            ),
            source="leetcode",  # Defaults to None if not provided
        )

        questions = [remove_extra_string_layers(q) for q in questions]

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"questions": questions}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)}),
        }
