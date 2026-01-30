FROM node:20-alpine

WORKDIR /app

# Create certs directory
RUN mkdir -p /certs

# Copy mkcert-generated certs (locally trusted)
COPY certs/api.resend.com.pem /certs/cert.pem
COPY certs/api.resend.com-key.pem /certs/key.pem

# Copy proxy script
COPY proxy.js .

EXPOSE 443

CMD ["node", "proxy.js"]
