FROM node:12 as frontend

RUN mkdir /tmp/frontend
WORKDIR /tmp/frontend

# cache hack; fragile
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
FROM python:3.7 as backend

RUN mkdir /opt/stayhome-dashboard
WORKDIR /opt/stayhome-dashboard

# Copy front-end files built in previous stage
COPY --from=frontend /tmp/frontend/dashboard/dist/ /opt/stayhome-dashboard/dashboard/static/

ENV FLASK_APP=dashboard:create_app

# cache hack; very fragile
COPY requirements.txt ./
RUN pip install --requirement requirements.txt

COPY . .

CMD gunicorn --bind "0.0.0.0:${PORT:-8000}" 'dashboard:create_app()'

EXPOSE 8000
