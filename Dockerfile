FROM nginx:alpine
COPY index.html style.css app.js /usr/share/nginx/html/
COPY favicon.png colordle_icon.png /usr/share/nginx/html/
EXPOSE 80
