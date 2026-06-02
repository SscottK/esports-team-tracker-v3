.PHONY: migrate run-api run-web setup

setup:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
	cd frontend && npm install

migrate:
	cd backend && .venv/bin/python manage.py migrate

run-api:
	cd backend && .venv/bin/python manage.py runserver

run-web:
	cd frontend && npm run dev
