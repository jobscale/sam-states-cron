FROM public.ecr.aws/lambda/nodejs:20
COPY package.json package.json
RUN chmod go+rX package.json
RUN npm i --omit=dev
COPY index.js index.js
RUN chmod go+rX index.js
CMD ["index.handler"]
