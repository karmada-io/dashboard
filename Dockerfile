FROM nginx:stable-alpine
COPY build/ /usr/share/nginx/html/
RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]