import httpx
import datetime
import os

BASE_URL = os.getenv("QUESTIONS_API_URL")


class WeeklyQuestionsError(Exception):
    """Custom exception for errors fetching weekly questions."""

    pass


async def get_questions(
    count=5,
    difficulty_easy="introductory",
    difficulty_hard="interview",
):
    print("Entering get_questions()...")
    """
    Fetches two sets of questions (easy & hard) from the external API.
    Raises a WeeklyQuestionsError for network, status, or JSON errors.
    Returns a dict with keys 'easy' and 'hard' containing lists of questions.
    """
    query_string = f"/random-questions?count={count}&difficulty="
    url_easy = f"{BASE_URL}{query_string}{difficulty_easy}"
    url_hard = f"{BASE_URL}{query_string}{difficulty_hard}"
    print("Constructed URLs for easy and hard calls")
    try:
        print("Enterying try block to make call...")
        async with httpx.AsyncClient(timeout=72.0) as client:
            print("Making calls")
            easy_response = await client.get(url_easy)
            print("First call made")
            hard_response = await client.get(url_hard)
            print("Second call made")
    except httpx.RequestError as exc:
        raise WeeklyQuestionsError(
            f"Failed to contact external API: {str(exc)}"
        ) from exc

    if easy_response.status_code != 200:
        raise WeeklyQuestionsError(
            f"Error fetching easy questions. Status code: {easy_response.status_code}"
        )
    if hard_response.status_code != 200:
        raise WeeklyQuestionsError(
            f"Error fetching hard questions. Status code: {hard_response.status_code}"
        )

    try:
        easy_questions = easy_response.json()
        hard_questions = hard_response.json()
    except ValueError as exc:
        raise WeeklyQuestionsError(
            f"Invalid JSON response from external API: {str(exc)}"
        ) from exc

    return {"easy": easy_questions, "hard": hard_questions}


def get_day_start(reference=None):
    """
    Returns a datetime object representing the start of the day (00:00 UTC)
    for the given reference time, or the current time if not provided.
    """
    if reference is None:
        reference = datetime.datetime.utcnow()
    return datetime.datetime.combine(reference.date(), datetime.time.min)


def format_questions_data(questions_data):
    """
    Formats the fetched questions data for caching.
    Adds a "timestamp" field representing today's day start and
    organizes the questions under "easy" and "hard" keys.

    Expected input format:
    {
      "easy": [ {...}, {...}, ... ],
      "hard": [ {...}, {...}, ... ]
    }

    Returns a dict like:
    {
      "timestamp": "2025-03-02T00:00:00",
      "questions": {
          "easy": [...],
          "hard": [...]
      }
    }
    """
    # Compute today's boundary (00:00 UTC)
    day_start = get_day_start().isoformat()

    cache_payload = {
        "timestamp": day_start,
        "questions": {
            "easy": questions_data.get("easy", []),
            "hard": questions_data.get("hard", []),
        },
    }

    return cache_payload
