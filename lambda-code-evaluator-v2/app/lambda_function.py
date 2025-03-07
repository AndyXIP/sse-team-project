import json
import asyncio
from cache_storing import store_result_in_valkey
from code_validation import validate_user_code
from code_execution import execute_user_code_subprocess, evaluate_results


def process_submission(job_id, starter_code, user_code, test_cases):
    """
    End-to-end function to validate, execute, and evaluate user code.
    Returns a structured JSON response with status, execution results, and errors.
    """
    print("Entering process_submission()...")
    print(
        (
            f"job_id: {job_id}, starter_code: {starter_code}, "
            f"user_code: {user_code}, test_cases: {test_cases}"
        )
    )

    # Ensure required fields are present
    if not user_code or not job_id or not test_cases or not starter_code:
        print("Required fields are missing")
        return {
            "job_status": "completed",
            "error": "Missing required fields: 'user_code', 'job_id', or 'test_cases'.",
        }

    # Step 1 & 2: Validate User Code
    validation_result = validate_user_code(starter_code, user_code)
    if "error" in validation_result:
        return {"job_status": "completed", "error": validation_result["error"]}

    # Step 3: Execute User Code
    execution_result = execute_user_code_subprocess(user_code, test_cases)
    if "error" in execution_result:
        return {"job_status": "completed", "error": execution_result["error"]}

    # Step 4: Evaluate Results
    evaluation_result = evaluate_results(test_cases, execution_result)

    # Format final response
    evaluation_result.update({"job_status": "completed", "job_id": job_id})
    return evaluation_result


# ------------------------------
# Main handler for Lambda
# ------------------------------
def lambda_handler(event, context):
    print("Entering lambda...", event)
    try:
        if "Records" in event:
            record = event["Records"][0]  # batch size of 1

            body_str = record["body"]  # SQS JSON string
            body_obj = json.loads(body_str)  # Make into dict
            user_code = body_obj.get("code")
            test_cases = body_obj.get("test_cases")
            job_id = body_obj.get("job_id")
            starter_code = body_obj.get("starter_code")
            user_id = body_obj.get("user_id")
            difficulty = body_obj.get("difficulty")
            is_submit = body_obj.get("is_submit")
            problem_id = body_obj.get("problem_id")

            if not user_code:
                print("Missing user_code.")
                return {
                    "statusCode": 400,
                    "body": json.dumps("Missing user_code."),
                }
            if not job_id:
                print("Missing job_id.")
                return {
                    "statusCode": 400,
                    "body": json.dumps("Missing job_id."),
                }

            input_cases = test_cases.get("inputs")
            expected_outputs = test_cases.get("outputs")

            if not input_cases or not expected_outputs:
                print("Missing test case data.")
                return {
                    "statusCode": 400,
                    "body": json.dumps("Missing test case data."),
                }

            print("Data from job successfully accessed.")
            results = process_submission(
                job_id, starter_code, user_code, test_cases
            )

            # Add difficulty and user_id to results
            results.update(
                {
                    "difficulty": difficulty,
                    "user_id": user_id,
                    "is_submit": is_submit,
                    "problem_id": problem_id,
                }
            )
            print(f"results with user_id and diff: {results}")

            # Store the updated results in Valkey
            print("Calling store result in Valkey")
            asyncio.run(store_result_in_valkey(job_id, results))

            return {"statusCode": 200, "body": json.dumps(results)}

        else:
            err = "Event not in expected SQS format!"
            print(err)
            return {"statusCode": 500, "body": json.dumps({"error": err})}
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
