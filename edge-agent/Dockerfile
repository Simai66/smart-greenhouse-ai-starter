FROM python:3.13-alpine

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --no-cache-dir -r /app/requirements.txt
COPY greenhouse_agent.py /app/greenhouse_agent.py
COPY backup_agent_db.py /app/backup_agent_db.py
USER 65532:65532
ENV PYTHONUNBUFFERED=1
CMD ["python", "/app/greenhouse_agent.py"]
