const express = require('express');
const router = express.Router(),
    path = require('path'),
    https = require('https'),
    sa = require('./songAna.js')
    fs = require('fs');


module.exports = function(io) {
    // router.get('/logo', function(req, res, next) {
    //     // let logo = !!fs.existsSync('./public/img/logo.jpg')?'/img/logo.jpg':'/img/blanklogo.png';
    //     // console.log('logo',fs.readdirSync('./public/img'),)
    //     const logo = fs.readdirSync('./public/img').find(t=>t.slice(0,t.lastIndexOf('.'))=='logo')||'blanklogo.png';
    //     res.sendFile('/img/'+logo, { root: './public' })
    // });
    router.get('/song',(req,res,next)=>{
    	let sd = null,
    	tid = req.query.timedelta||null,
    	tnr = req.query.totalreads||null;
    	if(req.query.start && !isNaN(new Date(req.query.start).getTime())){
    		sd = new Date(req.query.start);
    	}
    	sa.song(sd,tid,tnr).then(r=>{
    		res.send(r);
    	});
    })
    router.get('*', function(req, res, next) {
        console.log('trying to get main page!')
        res.sendFile('index.html', { root: './views' })
    });
    router.use(function(req, res) {
        res.status(404).end();
    });
    return router;
};

Array.prototype.removeOne=function(n){
    this.splice(this.indexOf(n),1);
}