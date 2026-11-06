const express = require('express');
const path = require('node:path');
const { existsSync } = require('node:fs');
const { requestContext, errorHandler, AppError } = require('./lib/errors');
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
app.use(requestContext);
require('./middleware/security')(app);
app.use(express.json({limit:'128kb'}));
app.use('/api',require('./routes'));
app.use('/api',(req,res,next)=>next(new AppError('NOT_FOUND',404)));

const frontendDirectory = path.join(__dirname,'public');
if (existsSync(path.join(frontendDirectory,'index.html'))) {
  app.use(express.static(frontendDirectory,{index:false}));
  app.get(/.*/,(req,res,next)=>{
    if (!req.accepts('html') || path.extname(req.path)) return next(new AppError('NOT_FOUND',404));
    res.sendFile(path.join(frontendDirectory,'index.html'));
  });
} else {
  app.get('/',(req,res)=>res.json({service:'METMMA Pharmacy API'}));
}

app.use((req,res,next)=>next(new AppError('NOT_FOUND',404)));
app.use(errorHandler);
module.exports = app;
