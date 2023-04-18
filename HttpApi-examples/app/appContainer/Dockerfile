FROM public.ecr.aws/lambda/nodejs:18
COPY package.json package.json
RUN npm i --omit=dev
COPY index.js index.js
