FROM node:20-alpine

WORKDIR /app

# Create certs directory (certs mounted as volume at runtime)
RUN mkdir -p /certs

# Copy proxy script
COPY proxy.js .

EXPOSE 443

CMD ["node", "proxy.js"]
