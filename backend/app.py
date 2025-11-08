from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import boto3
from botocore.exceptions import ClientError
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid
import google.generativeai as genai
import PyPDF2
import io

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': int(os.getenv('DB_PORT', 3306))
}

# AWS S3 configuration
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)
S3_BUCKET = os.getenv('S3_BUCKET_NAME')

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Helper function to get database connection
def get_db_connection():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

# Helper function to extract text from PDF
def extract_text_from_pdf(pdf_file):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return None

# Helper function to extract candidate name from resume
def extract_candidate_name(text):
    """
    Extract candidate name from resume text using heuristics.
    Assumes name is in the first few lines of the resume.
    """
    try:
        lines = text.strip().split('\n')
        # Get first 5 non-empty lines
        first_lines = [line.strip() for line in lines[:5] if line.strip()]
        
        if not first_lines:
            return "the candidate"
        
        # Use Gemini to extract the name
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        name_prompt = f"""From the following resume excerpt, extract ONLY the candidate's full name. 
Return just the name, nothing else. If you cannot find a clear name, return "Candidate".

Resume excerpt:
{chr(10).join(first_lines[:3])}
"""
        response = model.generate_content(name_prompt)
        name = response.text.strip()
        
        # Validate the name (should be 2-4 words, not too long)
        words = name.split()
        if 1 <= len(words) <= 4 and len(name) < 50:
            return name
        else:
            return "the candidate"
            
    except Exception as e:
        print(f"Error extracting name: {e}")
        return "the candidate"

# ========== AUTHENTICATION ENDPOINTS ==========

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not all([name, email, password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password and insert user
        hashed_password = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (name, email, password) VALUES (%s, %s, %s)',
            (name, email, hashed_password)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Registration successful',
            'user': {'id': user_id, 'name': name, 'email': email}
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'error': 'Email and password required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user or not check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== PROBLEM TRACKER ENDPOINTS ==========

@app.route('/api/problems', methods=['GET'])
def get_problems():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM problems WHERE user_id = %s ORDER BY created_at DESC',
            (user_id,)
        )
        problems = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(problems), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems', methods=['POST'])
def add_problem():
    try:
        data = request.json
        user_id = data.get('user_id')
        number = data.get('number')
        name = data.get('name')
        difficulty = data.get('difficulty')
        topic = data.get('topic')
        summary = data.get('summary', '')
        notes = data.get('notes', '')
        
        if not all([user_id, number, name, difficulty, topic]):
            return jsonify({'error': 'All fields except summary and notes are required'}), 400
        
        # Calculate points based on difficulty
        points = {'Easy': 10, 'Medium': 25, 'Hard': 50}.get(difficulty, 10)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''INSERT INTO problems (user_id, number, name, difficulty, topic, summary, notes, points)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
            (user_id, number, name, difficulty, topic, summary, notes, points)
        )
        conn.commit()
        problem_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Problem added successfully',
            'id': problem_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems/<int:problem_id>', methods=['PUT'])
def update_problem(problem_id):
    try:
        data = request.json
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if 'number' in data:
            update_fields.append('number = %s')
            values.append(data['number'])
        if 'name' in data:
            update_fields.append('name = %s')
            values.append(data['name'])
        if 'difficulty' in data:
            update_fields.append('difficulty = %s')
            values.append(data['difficulty'])
            # Update points based on new difficulty
            points = {'Easy': 10, 'Medium': 25, 'Hard': 50}.get(data['difficulty'], 10)
            update_fields.append('points = %s')
            values.append(points)
        if 'topic' in data:
            update_fields.append('topic = %s')
            values.append(data['topic'])
        if 'summary' in data:
            update_fields.append('summary = %s')
            values.append(data['summary'])
        if 'notes' in data:
            update_fields.append('notes = %s')
            values.append(data['notes'])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        values.append(problem_id)
        query = f"UPDATE problems SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, tuple(values))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Problem updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems/<int:problem_id>', methods=['DELETE'])
def delete_problem(problem_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM problems WHERE id = %s', (problem_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Problem deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== DASHBOARD ANALYTICS ENDPOINTS ==========

@app.route('/api/analytics/difficulty', methods=['GET'])
def analytics_by_difficulty():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT difficulty, COUNT(*) as count
               FROM problems
               WHERE user_id = %s
               GROUP BY difficulty''',
            (user_id,)
        )
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/topic', methods=['GET'])
def analytics_by_topic():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT topic, COUNT(*) as count
               FROM problems
               WHERE user_id = %s
               GROUP BY topic
               ORDER BY count DESC''',
            (user_id,)
        )
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/points', methods=['GET'])
def analytics_points_over_time():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT DATE(created_at) as date, SUM(points) as total_points
               FROM problems
               WHERE user_id = %s
               GROUP BY DATE(created_at)
               ORDER BY date ASC''',
            (user_id,)
        )
        results = cursor.fetchall()
        
        # Calculate cumulative points
        cumulative = 0
        cumulative_data = []
        for row in results:
            cumulative += row['total_points']
            cumulative_data.append({
                'date': row['date'].strftime('%Y-%m-%d'),
                'points': cumulative
            })
        
        cursor.close()
        conn.close()
        
        return jsonify(cumulative_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/summary', methods=['GET'])
def analytics_summary():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total problems
        cursor.execute(
            'SELECT COUNT(*) as total FROM problems WHERE user_id = %s',
            (user_id,)
        )
        total = cursor.fetchone()['total']
        
        # Total points
        cursor.execute(
            'SELECT SUM(points) as total_points FROM problems WHERE user_id = %s',
            (user_id,)
        )
        points_result = cursor.fetchone()
        total_points = points_result['total_points'] if points_result['total_points'] else 0
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'total_problems': total,
            'total_points': total_points
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== RESUME UPLOAD ENDPOINT ==========

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        user_id = request.form.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed'}), 400
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"resumes/{user_id}_{uuid.uuid4()}.{file_extension}"
        
        # Upload to S3
        s3_client.upload_fileobj(
            file,
            S3_BUCKET,
            unique_filename,
            ExtraArgs={'ContentType': 'application/pdf'}
        )
        
        # Generate presigned URL (valid for 1 hour)
        file_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': unique_filename},
            ExpiresIn=3600
        )
        
        # Save to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''INSERT INTO resumes (user_id, filename, s3_key, file_url)
               VALUES (%s, %s, %s, %s)''',
            (user_id, file.filename, unique_filename, file_url)
        )
        conn.commit()
        resume_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Resume uploaded successfully',
            'resume_id': resume_id,
            'file_url': file_url
        }), 201
        
    except ClientError as e:
        return jsonify({'error': f'AWS S3 error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/resumes', methods=['GET'])
def get_resumes():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM resumes WHERE user_id = %s ORDER BY uploaded_at DESC',
            (user_id,)
        )
        resumes = cursor.fetchall()
        
        # Generate fresh presigned URLs
        for resume in resumes:
            resume['file_url'] = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': resume['s3_key']},
                ExpiresIn=3600
            )
        
        cursor.close()
        conn.close()
        
        return jsonify(resumes), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== GEMINI AI RESUME ANALYSIS ENDPOINT ==========

@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
    try:
        if not GEMINI_API_KEY:
            return jsonify({'error': 'Gemini API key not configured'}), 500
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed'}), 400
        
        # Extract text from PDF
        pdf_text = extract_text_from_pdf(io.BytesIO(file.read()))
        
        if not pdf_text:
            return jsonify({'error': 'Could not extract text from PDF'}), 400
        
        # Extract candidate name
        candidate_name = extract_candidate_name(pdf_text)
        
        # Analyze with Gemini using the custom prompt
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        prompt = f"""You are an expert career advisor. Review this resume for {candidate_name} carefully.

Tasks:
1. Give a **short summary** (2–3 lines) of their professional profile.
2. Identify 3–5 **strengths** and 3–5 **areas to improve**.
3. Suggest **keyword optimizations** for ATS systems.
4. Recommend **action verbs** and **restructuring tips** to make it stronger.

Resume Text:
{pdf_text[:15000]}
"""

        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            'analysis': analysis,
            'candidate_name': candidate_name,
            'message': 'Resume analyzed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Analysis error: {str(e)}'}), 500

# ========== PROBLEM NOTES ENDPOINTS ==========

@app.route('/api/notes/<int:problem_id>', methods=['GET'])
def get_notes(problem_id):
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM problem_notes WHERE problem_id = %s AND user_id = %s',
            (problem_id, user_id)
        )
        notes = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify(notes if notes else {}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes', methods=['POST'])
def create_or_update_notes():
    try:
        data = request.json
        problem_id = data.get('problem_id')
        user_id = data.get('user_id')
        approach = data.get('approach', '')
        solution_code = data.get('solution_code', '')
        time_complexity = data.get('time_complexity', '')
        space_complexity = data.get('space_complexity', '')
        key_insights = data.get('key_insights', '')
        mistakes_made = data.get('mistakes_made', '')
        related_problems = data.get('related_problems', '')
        
        if not all([problem_id, user_id]):
            return jsonify({'error': 'problem_id and user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if notes already exist
        cursor.execute(
            'SELECT id FROM problem_notes WHERE problem_id = %s AND user_id = %s',
            (problem_id, user_id)
        )
        existing = cursor.fetchone()
        
        if existing:
            # Update existing notes
            cursor.execute(
                '''UPDATE problem_notes SET 
                   approach = %s, solution_code = %s, time_complexity = %s, 
                   space_complexity = %s, key_insights = %s, mistakes_made = %s, 
                   related_problems = %s, updated_at = CURRENT_TIMESTAMP
                   WHERE problem_id = %s AND user_id = %s''',
                (approach, solution_code, time_complexity, space_complexity, 
                 key_insights, mistakes_made, related_problems, problem_id, user_id)
            )
            message = 'Notes updated successfully'
        else:
            # Create new notes
            cursor.execute(
                '''INSERT INTO problem_notes 
                   (problem_id, user_id, approach, solution_code, time_complexity, 
                    space_complexity, key_insights, mistakes_made, related_problems)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                (problem_id, user_id, approach, solution_code, time_complexity, 
                 space_complexity, key_insights, mistakes_made, related_problems)
            )
            message = 'Notes created successfully'
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': message}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<int:problem_id>', methods=['DELETE'])
def delete_notes(problem_id):
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'DELETE FROM problem_notes WHERE problem_id = %s AND user_id = %s',
            (problem_id, user_id)
        )
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Notes deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== AI PROBLEM RECOMMENDATION ENDPOINT ==========

@app.route('/api/suggest-problems', methods=['POST'])
def suggest_problems():
    try:
        if not GEMINI_API_KEY:
            return jsonify({'error': 'Gemini API key not configured'}), 500
        
        data = request.json
        user_id = data.get('user_id')
        topic = data.get('topic')  # Can be None or a specific topic
        
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        # Get all solved problems for the user
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT number, name, difficulty, topic FROM problems WHERE user_id = %s',
            (user_id,)
        )
        solved_problems = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Format solved problems list
        solved_list = []
        for p in solved_problems:
            solved_list.append(f"{p['number']} - {p['name']} ({p['difficulty']}, {p['topic']})")
        
        solved_problem_list = "\n".join(solved_list) if solved_list else "No problems solved yet."
        
        # Build Gemini prompt
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        if topic and topic.lower() != 'none':
            prompt = f"""You are an expert DSA tutor helping users improve coding problem coverage.

The user has already solved the following problems (from their practice tracker):
{solved_problem_list}

They want new recommendations specifically for the topic: {topic}

Recommend 5 unsolved LeetCode-style problems from the {topic} topic, balanced across easy, medium, and hard difficulties. Ensure these problems are NOT in the solved list above.

Format your response STRICTLY as a JSON array (no markdown, no extra text):
[
  {{"problem_name": "Two Sum", "topic": "Arrays", "difficulty": "Easy", "reason": "Classic problem for hash maps"}},
  {{"problem_name": "...", "topic": "...", "difficulty": "...", "reason": "..."}}
]
"""
        else:
            prompt = f"""You are an expert DSA tutor helping users improve coding problem coverage.

The user has already solved the following problems (from their practice tracker):
{solved_problem_list}

They want general recommendations (no specific topic).

Recommend 5 problems total:
- 3 problems that are similar to the solved ones (based on topic/difficulty patterns, but slightly harder or related)
- 2 problems that are new topics but relevant to their learning curve

Ensure these problems are NOT in the solved list above.

Format your response STRICTLY as a JSON array (no markdown, no extra text):
[
  {{"problem_name": "Two Sum", "topic": "Arrays", "difficulty": "Easy", "reason": "Classic problem for hash maps"}},
  {{"problem_name": "...", "topic": "...", "difficulty": "...", "reason": "..."}}
]
"""
        
        response = model.generate_content(prompt)
        recommendations_text = response.text.strip()
        
        # Try to parse JSON (remove markdown if present)
        if recommendations_text.startswith('```'):
            # Remove markdown code blocks
            recommendations_text = recommendations_text.split('```')[1]
            if recommendations_text.startswith('json'):
                recommendations_text = recommendations_text[4:]
            recommendations_text = recommendations_text.strip()
        
        # Parse JSON
        import json
        try:
            recommendations = json.loads(recommendations_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw text
            return jsonify({
                'recommendations': [],
                'raw_text': recommendations_text,
                'message': 'Could not parse recommendations as JSON'
            }), 200
        
        return jsonify({
            'recommendations': recommendations,
            'topic': topic,
            'message': 'Recommendations generated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Recommendation error: {str(e)}'}), 500

# ========== GUIDED PROBLEM SOLVER ENDPOINT ==========

@app.route('/api/solve-problem', methods=['POST'])
def solve_problem():
    """
    Step-by-step guided DSA problem solver.
    Stages: explain, hint, feedback, solution
    """
    try:
        if not GEMINI_API_KEY:
            return jsonify({'error': 'Gemini API key not configured'}), 500
        
        data = request.get_json()
        problem = data.get('problem', '').strip()
        stage = data.get('stage', 'explain')
        user_input = data.get('user_input', '').strip()
        conversation_history = data.get('conversation_history', [])  # NEW: Get history
        
        if not problem:
            return jsonify({'error': 'Problem statement missing'}), 400
        
        # Core prompt logic
        base_system_prompt = (
            "You are an expert DSA mentor. "
            "You help students solve coding problems step-by-step. "
            "Your tone is encouraging and structured. "
            "You always respond in clean Markdown (use bullet points, code blocks where needed). "
            "IMPORTANT: When giving hints, be progressive. If you've given hints before, make the next one more specific."
        )
        
        # Build context from conversation history
        context = ""
        if conversation_history:
            context = "\n\nPrevious conversation (for your context - you are the Mentor):\n"
            context += "=" * 60 + "\n"
            for msg in conversation_history:
                role = msg.get('role', '')
                content = msg.get('content', '')
                if role == 'user':
                    context += f"[STUDENT SAID]: {content}\n\n"
                elif role == 'assistant':
                    context += f"[YOU (MENTOR) SAID]: {content}\n\n"
            context += "=" * 60 + "\n"
            context += "Remember: Everything marked [YOU (MENTOR) SAID] was YOUR previous response, not the student's work.\n"
        
        # Stage-specific instructions
        if stage == 'explain':
            user_prompt = (
                f"Explain the following problem in simple, beginner-friendly language:\n\n{problem}"
            )
        elif stage == 'hint':
            # Count previous hints to make them progressive
            hint_count = sum(1 for msg in conversation_history if msg.get('role') == 'user' and 'hint' in msg.get('content', '').lower())
            
            if hint_count == 0:
                hint_instruction = "Give the FIRST hint - be vague and high-level. Just point towards the general approach or data structure without specifics."
            elif hint_count == 1:
                hint_instruction = "Give the SECOND hint - be more specific. Mention the exact approach or algorithm, but don't reveal implementation details."
            elif hint_count == 2:
                hint_instruction = "Give the THIRD hint - be very direct. Provide key implementation details, edge cases, or the main logic flow."
            else:
                hint_instruction = "Give a FINAL hint - at this point, provide almost the complete approach with pseudocode if needed."
            
            user_prompt = (
                f"{hint_instruction}\n\n"
                f"Problem:\n{problem}\n"
                f"{context}"
            )
        elif stage == 'feedback':
            user_prompt = (
                "You are evaluating a student's partial idea. "
                "Give constructive feedback — tell what's good and what can improve. "
                "Do not give the full solution yet.\n\n"
                f"Student's thought:\n{user_input}\n\n"
                f"Problem:\n{problem}\n"
                f"{context}"
            )
        elif stage == 'solution':
            user_prompt = (
                "Now provide the full optimal solution with step-by-step explanation, "
                "time and space complexity, and possible alternative approaches.\n\n"
                f"Problem:\n{problem}\n"
                f"{context}"
            )
        else:
            return jsonify({'error': 'Invalid stage'}), 400
        
        # Generate response from Gemini
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        response = model.generate_content(f"{base_system_prompt}\n\n{user_prompt}")
        
        output = response.text.strip() if response and hasattr(response, 'text') else 'No response.'
        
        return jsonify({'response': output}), 200
        
    except Exception as e:
        print('Error in /api/solve-problem:', e)
        return jsonify({'error': 'Something went wrong processing your request.'}), 500

# ========== LEADERBOARD ENDPOINT ==========

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT u.name, u.email, SUM(p.points) as total_points, COUNT(p.id) as total_problems
               FROM users u
               LEFT JOIN problems p ON u.id = p.user_id
               GROUP BY u.id
               ORDER BY total_points DESC, total_problems DESC
               LIMIT 10'''
        )
        leaderboard = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(leaderboard), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== HEALTH CHECK ==========

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)

# ========== AUTHENTICATION ENDPOINTS ==========

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not all([name, email, password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password and insert user
        hashed_password = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (name, email, password) VALUES (%s, %s, %s)',
            (name, email, hashed_password)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Registration successful',
            'user': {'id': user_id, 'name': name, 'email': email}
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'error': 'Email and password required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user or not check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== PROBLEM TRACKER ENDPOINTS ==========

@app.route('/api/problems', methods=['GET'])
def get_problems():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM problems WHERE user_id = %s ORDER BY created_at DESC',
            (user_id,)
        )
        problems = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(problems), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems', methods=['POST'])
def add_problem():
    try:
        data = request.json
        user_id = data.get('user_id')
        number = data.get('number')
        name = data.get('name')
        difficulty = data.get('difficulty')
        topic = data.get('topic')
        summary = data.get('summary', '')
        
        if not all([user_id, number, name, difficulty, topic]):
            return jsonify({'error': 'All fields except summary are required'}), 400
        
        # Calculate points based on difficulty
        points = {'Easy': 10, 'Medium': 25, 'Hard': 50}.get(difficulty, 10)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''INSERT INTO problems (user_id, number, name, difficulty, topic, summary, points)
               VALUES (%s, %s, %s, %s, %s, %s, %s)''',
            (user_id, number, name, difficulty, topic, summary, points)
        )
        conn.commit()
        problem_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Problem added successfully',
            'id': problem_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems/<int:problem_id>', methods=['PUT'])
def update_problem(problem_id):
    try:
        data = request.json
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if 'number' in data:
            update_fields.append('number = %s')
            values.append(data['number'])
        if 'name' in data:
            update_fields.append('name = %s')
            values.append(data['name'])
        if 'difficulty' in data:
            update_fields.append('difficulty = %s')
            values.append(data['difficulty'])
            # Update points based on new difficulty
            points = {'Easy': 10, 'Medium': 25, 'Hard': 50}.get(data['difficulty'], 10)
            update_fields.append('points = %s')
            values.append(points)
        if 'topic' in data:
            update_fields.append('topic = %s')
            values.append(data['topic'])
        if 'summary' in data:
            update_fields.append('summary = %s')
            values.append(data['summary'])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        values.append(problem_id)
        query = f"UPDATE problems SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, tuple(values))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Problem updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems/<int:problem_id>', methods=['DELETE'])
def delete_problem(problem_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM problems WHERE id = %s', (problem_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Problem deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== DASHBOARD ANALYTICS ENDPOINTS ==========

@app.route('/api/analytics/difficulty', methods=['GET'])
def analytics_by_difficulty():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT difficulty, COUNT(*) as count
               FROM problems
               WHERE user_id = %s
               GROUP BY difficulty''',
            (user_id,)
        )
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/topic', methods=['GET'])
def analytics_by_topic():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT topic, COUNT(*) as count
               FROM problems
               WHERE user_id = %s
               GROUP BY topic
               ORDER BY count DESC''',
            (user_id,)
        )
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/points', methods=['GET'])
def analytics_points_over_time():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT DATE(created_at) as date, SUM(points) as total_points
               FROM problems
               WHERE user_id = %s
               GROUP BY DATE(created_at)
               ORDER BY date ASC''',
            (user_id,)
        )
        results = cursor.fetchall()
        
        # Calculate cumulative points
        cumulative = 0
        cumulative_data = []
        for row in results:
            cumulative += row['total_points']
            cumulative_data.append({
                'date': row['date'].strftime('%Y-%m-%d'),
                'points': cumulative
            })
        
        cursor.close()
        conn.close()
        
        return jsonify(cumulative_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/summary', methods=['GET'])
def analytics_summary():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total problems
        cursor.execute(
            'SELECT COUNT(*) as total FROM problems WHERE user_id = %s',
            (user_id,)
        )
        total = cursor.fetchone()['total']
        
        # Total points
        cursor.execute(
            'SELECT SUM(points) as total_points FROM problems WHERE user_id = %s',
            (user_id,)
        )
        points_result = cursor.fetchone()
        total_points = points_result['total_points'] if points_result['total_points'] else 0
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'total_problems': total,
            'total_points': total_points
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== RESUME UPLOAD ENDPOINT ==========

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        user_id = request.form.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed'}), 400
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"resumes/{user_id}_{uuid.uuid4()}.{file_extension}"
        
        # Upload to S3
        s3_client.upload_fileobj(
            file,
            S3_BUCKET,
            unique_filename,
            ExtraArgs={'ContentType': 'application/pdf'}
        )
        
        # Generate presigned URL (valid for 1 hour)
        file_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': unique_filename},
            ExpiresIn=3600
        )
        
        # Save to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''INSERT INTO resumes (user_id, filename, s3_key, file_url)
               VALUES (%s, %s, %s, %s)''',
            (user_id, file.filename, unique_filename, file_url)
        )
        conn.commit()
        resume_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Resume uploaded successfully',
            'resume_id': resume_id,
            'file_url': file_url
        }), 201
        
    except ClientError as e:
        return jsonify({'error': f'AWS S3 error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/resumes', methods=['GET'])
def get_resumes():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM resumes WHERE user_id = %s ORDER BY uploaded_at DESC',
            (user_id,)
        )
        resumes = cursor.fetchall()
        
        # Generate fresh presigned URLs
        for resume in resumes:
            resume['file_url'] = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': resume['s3_key']},
                ExpiresIn=3600
            )
        
        cursor.close()
        conn.close()
        
        return jsonify(resumes), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== LEADERBOARD ENDPOINT ==========

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''SELECT u.name, u.email, SUM(p.points) as total_points, COUNT(p.id) as total_problems
               FROM users u
               LEFT JOIN problems p ON u.id = p.user_id
               GROUP BY u.id
               ORDER BY total_points DESC, total_problems DESC
               LIMIT 10'''
        )
        leaderboard = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(leaderboard), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== HEALTH CHECK ==========

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)