"""Generate initial quiz fixture data."""
import json
from datetime import datetime, timezone

ADMIN_UUID = "11111111-1111-1111-1111-111111111111"
FIXTURE_PATH = "quiz/fixtures/initial_quiz.json"


def now():
    return datetime.now(timezone.utc).isoformat()


def make_question(questionnaire_id, q_id, text, q_type, placement, options=None):
    """Create a question dict and its options."""
    question = {
        "model": "quiz.question",
        "pk": q_id,
        "fields": {
            "questionnaire": questionnaire_id,
            "question_type": q_type,
            "question": text,
            "created_at": now(),
            "updated_at": now(),
            "created_by": ADMIN_UUID,
            "placement": placement,
        },
    }
    option_records = []
    if options:
        for idx, (text, correct) in enumerate(options, start=1):
            option_records.append({
                "model": "quiz.options",
                "pk": f"{q_id}-{idx}",
                "fields": {
                    "question": q_id,
                    "text": text,
                    "correct": correct,
                },
            })
    return question, option_records


def main():
    questionnaire_ids = {
        "beginner": 1,
        "intermediate": 2,
        "expert": 3,
    }

    data = [
        {
            "model": "accounts.user",
            "pk": ADMIN_UUID,
            "fields": {
                "password": "!",
                "last_login": None,
                "is_superuser": False,
                "username": "quizadmin",
                "first_name": "",
                "last_name": "",
                "email": "quizadmin@example.com",
                "is_staff": False,
                "is_active": True,
                "date_joined": "2024-01-01T00:00:00Z",
                "phone": "",
                "full_name": "Quiz Admin",
                "is_coach": False,
                "is_student": False,
                "groups": [],
                "user_permissions": [],
            },
        },
        {
            "model": "quiz.questionnaire",
            "pk": questionnaire_ids["beginner"],
            "fields": {
                "title": "beginner",
                "description": "Beginner level chess assessment",
                "created_at": now(),
                "created_by": ADMIN_UUID,
            },
        },
        {
            "model": "quiz.questionnaire",
            "pk": questionnaire_ids["intermediate"],
            "fields": {
                "title": "intermediate",
                "description": "Intermediate level chess assessment",
                "created_at": now(),
                "created_by": ADMIN_UUID,
            },
        },
        {
            "model": "quiz.questionnaire",
            "pk": questionnaire_ids["expert"],
            "fields": {
                "title": "expert",
                "description": "Expert level chess assessment",
                "created_at": now(),
                "created_by": ADMIN_UUID,
            },
        },
    ]

    question_id_counter = 1
    option_id_counter = 1
    questions_data = [
        # Beginner
        make_question(
            questionnaire_ids["beginner"], question_id_counter,
            "Which chess piece can only move diagonally?",
            "radio", 1,
            [("Bishop", True), ("Rook", False), ("Knight", False), ("Queen", False)],
        ),
        make_question(
            questionnaire_ids["beginner"], question_id_counter + 1,
            "How many squares does a Knight move in its L-shape?",
            "radio", 2,
            [("1 square", False), ("2 squares in one direction and 1 in the other", True), ("3 squares", False), ("Any number of squares", False)],
        ),
        make_question(
            questionnaire_ids["beginner"], question_id_counter + 2,
            "What is the most powerful piece in chess?",
            "radio", 3,
            [("King", False), ("Queen", True), ("Rook", False), ("Bishop", False)],
        ),
        make_question(
            questionnaire_ids["beginner"], question_id_counter + 3,
            "What is the main goal of a chess game?",
            "radio", 4,
            [("Capture all opponent pieces", False), ("Checkmate the opponent's king", True), ("Promote a pawn", False), ("Castle both sides", False)],
        ),
        make_question(
            questionnaire_ids["beginner"], question_id_counter + 4,
            "Which piece can move one square in any direction?",
            "radio", 5,
            [("Pawn", False), ("Knight", False), ("King", True), ("Bishop", False)],
        ),
        make_question(
            questionnaire_ids["beginner"], question_id_counter + 5,
            "How many pawns does each player start with?",
            "radio", 6,
            [("6", False), ("8", True), ("10", False), ("16", False)],
        ),
        make_question(
            questionnaire_ids["beginner"], question_id_counter + 6,
            "Which piece is represented by a horse's head?",
            "text", 7,
            [("Knight", True)],
        ),
        make_question(
            questionnaire_ids["beginner"], question_id_counter + 7,
            "What is it called when the king is under attack and cannot escape?",
            "text", 8,
            [("Checkmate", True)],
        ),

        # Intermediate
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 8,
            "What is a fork in chess?",
            "radio", 1,
            [("A piece attacks two or more opponent pieces at once", True), ("A special pawn move", False), ("When two rooks line up", False), ("A type of checkmate", False)],
        ),
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 9,
            "What is a pin?",
            "radio", 2,
            [("A piece is blocked and cannot move", False), ("A piece cannot move without exposing a more valuable piece behind it", True), ("A pawn reaches the last rank", False), ("The king is in check", False)],
        ),
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 10,
            "What is castling?",
            "radio", 3,
            [("Moving the king two squares towards a rook and moving the rook", True), ("Capturing the king", False), ("Promoting a pawn", False), ("A draw offer", False)],
        ),
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 11,
            "What does 'en passant' mean?",
            "radio", 4,
            [("A special pawn capture", True), ("Castling on the queen side", False), ("A type of stalemate", False), ("Resigning the game", False)],
        ),
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 12,
            "What is stalemate?",
            "radio", 5,
            [("When a player has no legal moves and their king is not in check", True), ("When the king is captured", False), ("When time runs out", False), ("When both players have equal material", False)],
        ),
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 13,
            "What is the value of a queen usually considered to be?",
            "radio", 6,
            [("3 points", False), ("5 points", False), ("9 points", True), ("Infinite", False)],
        ),
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 14,
            "Which opening begins with 1.e4 e5?",
            "text", 7,
            [("Open Game", True), ("King's Pawn Game", True)],
        ),
        make_question(
            questionnaire_ids["intermediate"], question_id_counter + 15,
            "What is a discovered attack?",
            "radio", 8,
            [("An attack revealed by moving one piece", True), ("An attack from a discovered piece", False), ("A check from a pawn", False), ("A double check", False)],
        ),

        # Expert
        make_question(
            questionnaire_ids["expert"], question_id_counter + 16,
            "What is zugzwang?",
            "radio", 1,
            [("A position where any move worsens your position", True), ("A forced checkmate", False), ("A drawn position", False), ("A winning attack", False)],
        ),
        make_question(
            questionnaire_ids["expert"], question_id_counter + 17,
            "What is a zwischenzug?",
            "radio", 2,
            [("An intermediate move played before an expected move", True), ("A move that wins material", False), ("A defensive tactic", False), ("A type of sacrifice", False)],
        ),
        make_question(
            questionnaire_ids["expert"], question_id_counter + 18,
            "What is the Sicilian Defense characterized by?",
            "radio", 3,
            [("1.e4 e5", False), ("1.e4 c5", True), ("1.d4 d5", False), ("1.c4 e5", False)],
        ),
        make_question(
            questionnaire_ids["expert"], question_id_counter + 19,
            "What is prophylaxis in chess?",
            "radio", 4,
            [("Preventing the opponent's plans and ideas", True), ("Attacking the king", False), ("Exchanging pieces", False), ("Pushing pawns", False)],
        ),
        make_question(
            questionnaire_ids["expert"], question_id_counter + 20,
            "What is a minority attack?",
            "radio", 5,
            [("A smaller pawn majority attacks a larger pawn majority", True), ("An attack with fewer pieces", False), ("A king hunt", False), ("A pawn breakthrough", False)],
        ),
        make_question(
            questionnaire_ids["expert"], question_id_counter + 21,
            "Which World Champion is known for the quote: 'When I am trying to find a plan, I first look at my opponent's position'?",
            "radio", 6,
            [("Bobby Fischer", False), ("Anatoly Karpov", True), ("Garry Kasparov", False), ("Magnus Carlsen", False)],
        ),
        make_question(
            questionnaire_ids["expert"], question_id_counter + 22,
            "What does the term 'isolani' refer to?",
            "text", 7,
            [("Isolated pawn", True), ("Isolated queen pawn", True)],
        ),
        make_question(
            questionnaire_ids["expert"], question_id_counter + 23,
            "What is the key idea behind the 'positional sacrifice'?",
            "radio", 8,
            [("Giving up material for long-term positional advantages", True), ("Sacrificing to checkmate", False), ("Exchanging queens", False), ("Losing material intentionally", False)],
        ),
    ]

    # Assign sequential integer PKs to questions and options
    current_qid = 1
    for q_template, opts_template in questions_data:
        q_template["pk"] = current_qid
        q_template["fields"]["placement"] = ((current_qid - 1) % 8) + 1
        data.append(q_template)
        for opt in opts_template:
            opt["pk"] = option_id_counter
            opt["fields"]["question"] = current_qid
            data.append(opt)
            option_id_counter += 1
        current_qid += 1

    with open(FIXTURE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Generated {FIXTURE_PATH} with {len(data)} records")


if __name__ == "__main__":
    main()
