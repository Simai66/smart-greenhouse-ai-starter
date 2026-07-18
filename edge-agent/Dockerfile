FROM python:3.13-alpine

WORKDIR /app
COPY greenhouse_agent.py /app/greenhouse_agent.py
USER 65532:65532
ENV PYTHONUNBUFFERED=1
CMD ["python", "/app/greenhouse_agent.py"]
