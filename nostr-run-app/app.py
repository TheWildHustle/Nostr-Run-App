import os
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)

app.config['SECRET_KEY'] = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.init_app(app)

from models import User, Run
from auth import auth as auth_blueprint

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

app.register_blueprint(auth_blueprint)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/run/start', methods=['POST'])
def start_run():
    new_run = Run(user_id=current_user.id, status='active')
    db.session.add(new_run)
    db.session.commit()
    return jsonify({'run_id': new_run.id})

@app.route('/api/run/<int:run_id>/update', methods=['POST'])
def update_run(run_id):
    run = Run.query.get_or_404(run_id)
    data = request.get_json()
    
    if data.get('status'):
        run.status = data['status']
    if data.get('distance'):
        run.distance = data['distance']
    if data.get('end_time'):
        run.end_time = datetime.utcnow()
        run.duration = (run.end_time - run.start_time).seconds
    
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/api/runs')
def get_runs():
    runs = Run.query.filter_by(user_id=current_user.id).order_by(Run.start_time.desc()).all()
    return jsonify([{
        'id': run.id,
        'start_time': run.start_time.isoformat(),
        'end_time': run.end_time.isoformat() if run.end_time else None,
        'duration': run.duration,
        'distance': run.distance,
        'status': run.status
    } for run in runs])

with app.app_context():
    db.create_all()
