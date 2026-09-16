FROM python:3.12-alpine
WORKDIR /app
RUN pip install --no-cache-dir edge-tts
COPY app.py .
EXPOSE 8899
CMD ["python", "app.py"]