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

# Helper function to get database connection
def get_db_connection():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

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