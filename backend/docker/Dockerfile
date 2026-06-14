# syntax=docker/dockerfile:1
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV APP_HOME=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR $APP_HOME

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser $APP_HOME
USER appuser

# Expose port
EXPOSE 8000

# Run entrypoint script
ENTRYPOINT ["/app/docker/entrypoint.sh"]
